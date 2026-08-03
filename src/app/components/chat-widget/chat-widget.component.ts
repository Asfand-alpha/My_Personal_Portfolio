import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ChatWindowComponent } from '../chat-window/chat-window.component';

type BotState = 'idle' | 'hover' | 'typing';

interface SafeZone {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

declare global {
  interface Window {
    setBotTyping?: (isTyping: boolean) => void;
  }
}

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, ChatWindowComponent],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  isVisible = false;
  chatOpen = false;

  private readonly modelUrl = 'assets/models/michi_bot.glb';

  // Desired on-screen size of the bot (its largest bounding-box dimension, in
  // css pixels) - the camera below is orthographic with 1 world unit == 1px,
  // so this is what actually controls how big it looks regardless of the
  // model's own native scale.
  private readonly desiredPixelSize = 90;

  // ---- Layout constants defining where it's "safe" to fly (kept in sync
  // with the site's .container { max-width: 1200px } so the bot never
  // crosses over the centered content column). ----
  private readonly contentMaxWidth = 1200;
  private readonly minGutter = 110;
  private readonly edgePadding = 30;
  private readonly topPadding = 90;
  private readonly bottomPadding = 50;

  // ---- Three.js core ----
  // Orthographic camera: world X/Y map 1:1 to viewport pixels (origin at
  // viewport center), which makes "fly to this screen position" trivial -
  // no perspective unprojection math needed.
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private readonly clock = new THREE.Clock();
  private modelRoot: THREE.Object3D | null = null;
  private frameId = 0;

  // ---- Baked animation (AnimationMixer) ----
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private actions: Partial<Record<BotState, THREE.AnimationAction>> = {};
  private activeAction: THREE.AnimationAction | null = null;

  // ---- Named parts, found by keyword if the model has them ----
  private headNode: THREE.Object3D | null = null;
  private waveNode: THREE.Object3D | null = null; // arm/shoulder-like part for the periodic wave
  private wingUpL: THREE.Object3D | null = null;
  private wingUpR: THREE.Object3D | null = null;
  private wingDownL: THREE.Object3D | null = null;
  private wingDownR: THREE.Object3D | null = null;

  private baseScale = new THREE.Vector3(1, 1, 1);

  // ---- Hover detection (raycasting every frame). The canvas itself is
  // pointer-events:none (so clicks/scroll always reach the page underneath),
  // so pointer position is tracked on `window`, not the canvas. ----
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2(-999, -999);
  private isHovering = false;

  // ---- State machine: typing > hover > idle ----
  private isTyping = false;
  private currentState: BotState = 'idle';

  // ---- Free-roaming flight within the safe zones ----
  private flyTarget = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private readonly flySpeed = 70; // css px/sec

  // Periodic "pause mid-flight and wave" (procedural only - see updateIdleFlight)
  private flightClock = 0;
  private nextWaveAt = this.randomWaveDelay();
  private isWaving = false;
  private waveTimer = 0;
  private readonly waveDuration = 1.4;

  // Where the bot flies to and parks while `typing` is true.
  private typingParkPoint = new THREE.Vector3();

  // ---- Waypoint routing: a straight line between two safe zones (e.g. the
  // left margin and the chat-park point on the right) can cut straight
  // through the centered content column. When the current position and the
  // target are in different zones, we route via an intermediate waypoint
  // along the top corridor (just below the navbar-clearance line) instead,
  // going "up and over" rather than straight across. ----
  private routeQueue: THREE.Vector3[] = [];
  private routeFinalTarget: THREE.Vector3 | null = null;

  ngOnInit() {
    setTimeout(() => (this.isVisible = true), 900);

    this.initScene();
    this.loadModel();
    this.exposeGlobalTypingHook();
    this.animate();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('click', this.onClick);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('click', this.onClick);
    delete window.setBotTyping;
    this.mixer?.stopAllAction();
    this.renderer?.dispose();
  }

  onChatClose() {
    this.chatOpen = false;
  }

  // =========================================================================
  // Scene / model setup
  // =========================================================================

  private initScene() {
    const canvas = this.canvasRef.nativeElement;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 2000);
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x2b2b2b, 1.1);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a5c, 0.6);
    rim.position.set(-3, 1, -2);
    this.scene.add(rim);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.pickTypingParkPoint();
    this.pickNewFlightTarget();
  }

  private loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      this.modelUrl,
      (gltf) => this.onModelLoaded(gltf),
      undefined,
      (err) => console.error('[ChatWidget] Failed to load model:', err)
    );
  }

  private onModelLoaded(gltf: GLTF) {
    this.modelRoot = gltf.scene;
    this.scene.add(gltf.scene);

    // ---- Debug visibility into what this .glb actually contains ----
    console.log('[ChatWidget] Animation clips found:', gltf.animations.map((c) => c.name));
    console.log('[ChatWidget] Node/bone hierarchy:');
    gltf.scene.traverse((obj) => console.log('  -', obj.name || '(unnamed)', `[${obj.type}]`));

    this.clips = gltf.animations;
    this.centerAndScaleModel(gltf.scene);
    this.baseScale.copy(gltf.scene.scale);
    console.log('[ChatWidget] On-screen scale applied:', this.baseScale.toArray());

    // Start at the first flight target instead of the world origin, so there's
    // no visible "pop" from (0,0,0) - which is the (unsafe, content-covering)
    // center of the viewport in this coordinate system.
    gltf.scene.position.copy(this.flyTarget);

    this.headNode = this.findNodeByKeywords(gltf.scene, ['head']);
    this.waveNode = this.findNodeByKeywords(gltf.scene, ['shoulder', 'arm', 'hand']);
    this.findWingNodes(gltf.scene);
    if (this.headNode) console.log('[ChatWidget] Procedural head target:', this.headNode.name);
    if (this.waveNode) console.log('[ChatWidget] Procedural wave target:', this.waveNode.name);
    if (this.wingUpL || this.wingUpR || this.wingDownL || this.wingDownR) {
      console.log('[ChatWidget] Wing targets:', {
        upL: this.wingUpL?.name,
        upR: this.wingUpR?.name,
        downL: this.wingDownL?.name,
        downR: this.wingDownR?.name
      });
    } else {
      console.log('[ChatWidget] No wing-named nodes found - flight will use a scale-pulse fallback instead.');
    }

    if (this.clips.length > 0) {
      this.mixer = new THREE.AnimationMixer(gltf.scene);
      this.setupBakedActions();
    } else {
      console.log('[ChatWidget] No animation clips at all -> every state uses PROCEDURAL fallback.');
    }

    this.setState('idle', true);
  }

  /** Recenters the model's own pivot to its bounding-box center, then scales
   *  it uniformly so its largest dimension equals `desiredPixelSize` css px -
   *  needed because the orthographic camera below maps 1 world unit to 1px,
   *  so the model's arbitrary native scale (meters? cm? a Sketchfab unit
   *  conversion?) would otherwise render at an unusable size. */
  private centerAndScaleModel(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scaleFactor = this.desiredPixelSize / maxDim;
    object.scale.multiplyScalar(scaleFactor);
  }

  private findNodeByKeywords(root: THREE.Object3D, keywords: string[]): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    root.traverse((obj) => {
      if (found) return;
      const name = obj.name.toLowerCase();
      if (keywords.some((k) => name.includes(k))) found = obj;
    });
    return found;
  }

  /** Best-effort generic matcher for 4 wing parts (up/down x left/right) by
   *  name, so this isn't hardcoded to one specific model's exact node names. */
  private findWingNodes(root: THREE.Object3D) {
    const wingNodes: THREE.Object3D[] = [];
    root.traverse((obj) => {
      if (obj.name.toLowerCase().includes('wing')) wingNodes.push(obj);
    });

    const isUp = (n: string) => /up/i.test(n);
    const isDown = (n: string) => /down/i.test(n);
    const isLeft = (n: string) => /(_i\b|left|_l\b)/i.test(n);
    const isRight = (n: string) => /(_d\b|right|_r\b)/i.test(n);

    this.wingUpL = wingNodes.find((n) => isUp(n.name) && isLeft(n.name)) ?? wingNodes[0] ?? null;
    this.wingUpR = wingNodes.find((n) => isUp(n.name) && isRight(n.name)) ?? wingNodes[1] ?? null;
    this.wingDownL = wingNodes.find((n) => isDown(n.name) && isLeft(n.name)) ?? wingNodes[2] ?? null;
    this.wingDownR = wingNodes.find((n) => isDown(n.name) && isRight(n.name)) ?? wingNodes[3] ?? null;
  }

  // =========================================================================
  // Safe flight zones - margins/corners around the centered content, so the
  // bot never flies over the readable text column.
  // =========================================================================

  private computeSafeZones(): SafeZone[] {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const gutter = Math.max(0, (w - this.contentMaxWidth) / 2);
    const usableGutter = gutter - this.edgePadding;

    // World Y is up (+h/2 = top of screen, -h/2 = bottom of screen) with this
    // orthographic camera, so topPadding (clearance from the fixed navbar)
    // trims the UPPER bound and bottomPadding trims the LOWER bound.
    const yMin = -(h / 2) + this.bottomPadding;
    const yMax = h / 2 - this.topPadding;

    if (usableGutter >= this.minGutter && yMax > yMin) {
      const left: SafeZone = { xMin: -(w / 2) + this.edgePadding, xMax: -(w / 2) + gutter, yMin, yMax };
      const right: SafeZone = { xMin: w / 2 - gutter, xMax: w / 2 - this.edgePadding, yMin, yMax };
      return [left, right];
    }

    // Fallback for narrow/laptop viewports with no usable side gutter: stay
    // in a small area near the bottom-right corner (like a classic chat icon).
    const boxSize = 140;
    return [
      {
        xMin: w / 2 - this.edgePadding - boxSize,
        xMax: w / 2 - this.edgePadding,
        yMin: -(h / 2) + this.bottomPadding,
        yMax: -(h / 2) + this.bottomPadding + boxSize
      }
    ];
  }

  private pickNewFlightTarget() {
    const zones = this.computeSafeZones();
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const x = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
    const y = zone.yMin + Math.random() * (zone.yMax - zone.yMin);
    this.flyTarget.set(x, y, 0);
  }

  private pickTypingParkPoint() {
    const zones = this.computeSafeZones();
    const zone = zones[zones.length - 1];
    this.typingParkPoint.set(zone.xMax - 50, zone.yMin + 70, 0);
  }

  /** Where the bot parks while the chat window is open - just above the
   *  window's top edge, rather than the generic typing corner, so it looks
   *  like it's keeping watch over the conversation. Falls back to the
   *  regular typing park point on the narrow-viewport chat layout, where the
   *  window nearly fills the screen and there's no sensible spot "above" it. */
  private computeChatParkPoint(): THREE.Vector3 {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width <= 420) return this.typingParkPoint;

    const chatWidth = 340;
    const chatHeight = 460;
    const chatMargin = 24;
    const gap = 55;

    const screenX = width - chatMargin - chatWidth / 2;
    const screenY = height - chatMargin - chatHeight - gap;

    return new THREE.Vector3(screenX - width / 2, height / 2 - screenY, 0);
  }

  private randomWaveDelay() {
    return 6 + Math.random() * 4;
  }

  /** Plans a path from the bot's current position to `target`. If both are
   *  in the same safe zone (or there's only one zone, e.g. the narrow-
   *  viewport fallback box), a straight line is already safe. If they're in
   *  *different* zones (left vs right), a direct line would cross the
   *  content column, so this inserts an intermediate waypoint along the top
   *  corridor - fly up to just below the navbar-clearance line first, then
   *  across, then down into the target zone. */
  private buildRouteTo(target: THREE.Vector3): THREE.Vector3[] {
    const zones = this.computeSafeZones();
    if (!this.modelRoot || zones.length < 2) return [target];

    const current = this.modelRoot.position;
    const zoneOf = (x: number) => (x < 0 ? zones[0] : zones[1]);
    if (zoneOf(current.x) === zoneOf(target.x)) return [target];

    const transitY = zones[0].yMax - 20;
    return [new THREE.Vector3(current.x, transitY, 0), new THREE.Vector3(target.x, transitY, 0), target.clone()];
  }

  /** Returns the next waypoint to steer toward on the way to `target`,
   *  (re)planning the route only when the ultimate target actually changes -
   *  not every frame. */
  private getRouteWaypoint(target: THREE.Vector3): THREE.Vector3 {
    const stale = !this.routeFinalTarget || !this.routeFinalTarget.equals(target) || this.routeQueue.length === 0;
    if (stale) {
      this.routeFinalTarget = target.clone();
      this.routeQueue = this.buildRouteTo(target);
    }
    return this.routeQueue[0];
  }

  /** Pops the current waypoint once reached, unless it's the final one (the
   *  caller handles "arrived" for that case). */
  private advanceRoute() {
    if (this.routeQueue.length > 1) this.routeQueue.shift();
  }

  // =========================================================================
  // BAKED CLIP wiring
  // =========================================================================

  private setupBakedActions() {
    if (!this.mixer) return;

    const findClip = (patterns: RegExp[]) => this.clips.find((c) => patterns.some((p) => p.test(c.name)));

    const idleClip = findClip([/idle/i, /fly/i, /hover/i, /wave/i, /\bhi\b/i, /hello/i, /greet/i]);
    const hoverClip = findClip([/smile/i, /happy/i, /laugh/i, /react/i]);
    const typingClip = findClip([/talk/i, /type/i, /speak/i, /active/i]);

    // Strict name matching only - an unlabeled/generic clip (e.g. a DCC tool's
    // default "Take 001" export) is deliberately NOT assumed to be "idle":
    // its content and camera framing are unknown and may not suit this
    // widget. PROCEDURAL fallback (the flight system below) is fully under
    // our control and is the safe default.
    if (idleClip) {
      this.actions.idle = this.mixer.clipAction(idleClip);
      console.log(`[ChatWidget] BAKED CLIP -> idle: "${idleClip.name}"`);
    } else {
      console.log('[ChatWidget] No baked clip for idle -> PROCEDURAL fallback (flight).');
    }

    if (hoverClip) {
      this.actions.hover = this.mixer.clipAction(hoverClip);
      console.log(`[ChatWidget] BAKED CLIP -> hover: "${hoverClip.name}"`);
    } else {
      console.log('[ChatWidget] No baked clip for hover -> PROCEDURAL fallback.');
    }

    if (typingClip) {
      this.actions.typing = this.mixer.clipAction(typingClip);
      console.log(`[ChatWidget] BAKED CLIP -> typing: "${typingClip.name}"`);
    } else {
      console.log('[ChatWidget] No baked clip for typing -> PROCEDURAL fallback.');
    }
  }

  // =========================================================================
  // Input / resize
  // =========================================================================

  private onPointerMove = (event: PointerEvent) => {
    this.pointerNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointerNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  // The canvas is pointer-events:none (clicks must always reach the page
  // underneath), so this listens on `window` instead and only reacts when
  // the click landed on the bot - reusing the same per-frame raycast result
  // that already drives the `hover` state.
  private onClick = () => {
    if (this.isHovering && !this.chatOpen) {
      this.chatOpen = true;
    }
  };

  private onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.pickTypingParkPoint();
  };

  private exposeGlobalTypingHook() {
    // Call window.setBotTyping(true) when a response starts streaming, and
    // window.setBotTyping(false) when it finishes. typing beats hover beats idle.
    window.setBotTyping = (value: boolean) => {
      this.isTyping = !!value;
    };
  }

  // =========================================================================
  // Render loop
  // =========================================================================

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1); // clamp so a tab-switch pause can't cause a huge jump

    if (this.modelRoot) {
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      this.isHovering = this.raycaster.intersectObject(this.modelRoot, true).length > 0;
    }

    // While the chat window is open, park the bot near it (same "typing"
    // park-and-wait behavior) instead of letting it roam or wave mid-chat.
    const nextState: BotState = this.isTyping || this.chatOpen ? 'typing' : this.isHovering ? 'hover' : 'idle';
    if (nextState !== this.currentState) this.setState(nextState);

    if (this.mixer) this.mixer.update(delta);
    this.updateBehavior(delta);

    this.renderer.render(this.scene, this.camera);
  };

  private setState(state: BotState, immediate = false) {
    this.currentState = state;
    const fadeDuration = immediate ? 0 : 0.35;

    const nextAction = this.actions[state];
    if (nextAction) {
      // ---- BAKED CLIP: crossfade into the matching action ----
      nextAction.reset().fadeIn(fadeDuration).play();
      if (this.activeAction && this.activeAction !== nextAction) {
        this.fadeOutAndStop(this.activeAction, fadeDuration);
      }
      this.activeAction = nextAction;
    } else if (this.activeAction) {
      // No baked clip for this state - fade out whatever was previously
      // playing so the PROCEDURAL fallback below can take over cleanly.
      this.fadeOutAndStop(this.activeAction, fadeDuration);
      this.activeAction = null;
    }

    if (state === 'idle') {
      this.flightClock = 0;
      this.isWaving = false;
    }
  }

  /**
   * fadeOut() alone only ramps an action's weight down - if it's never
   * explicitly stop()'d afterward, THREE.js can leave whatever property
   * values (e.g. a node's scale/rotation mid-clip) frozen at their last
   * evaluated state instead of releasing the binding back to the bind pose.
   * This is most noticeable when fading out to *no* replacement action
   * (procedural fallback), so we schedule an explicit stop() once the fade
   * visually completes.
   */
  private fadeOutAndStop(action: THREE.AnimationAction, duration: number) {
    action.fadeOut(duration);
    setTimeout(() => action.stop(), duration * 1000 + 50);
  }

  // =========================================================================
  // PROCEDURAL FALLBACK - only meaningfully drives things when the matching
  // baked action above is undefined for the current state.
  // =========================================================================

  private updateBehavior(delta: number) {
    if (!this.modelRoot) return;

    // Ease scale toward each state's target (relative to the model's own
    // on-screen base scale - NEVER a literal 1, see centerAndScaleModel).
    const scaleFactor = this.currentState === 'hover' ? 1.1 : 1;
    const targetScale = this.baseScale.clone().multiplyScalar(scaleFactor);
    this.modelRoot.scale.lerp(targetScale, delta * 6);

    switch (this.currentState) {
      case 'idle':
        if (!this.actions.idle) this.updateIdleFlight(delta);
        break;
      case 'hover':
        if (!this.actions.hover) this.updateHoverProcedural();
        break;
      case 'typing':
        if (!this.actions.typing) this.updateTypingProcedural(delta);
        break;
    }

    this.flapWings(delta);
  }

  /** PROCEDURAL FALLBACK: idle - free-roam flight between random waypoints
   *  within the safe zones, with a periodic pause-and-wave. */
  private updateIdleFlight(delta: number) {
    this.flightClock += delta;

    if (this.isWaving) {
      this.velocity.set(0, 0, 0);
      this.waveTimer += delta;
      const progress = Math.min(this.waveTimer / this.waveDuration, 1);
      if (this.waveNode) {
        const raise = Math.sin(progress * Math.PI);
        const wag = Math.sin(progress * Math.PI * 6) * 0.15 * raise;
        this.waveNode.rotation.z = raise * 0.9 + wag;
      }
      if (progress >= 1) {
        this.isWaving = false;
        if (this.waveNode) this.waveNode.rotation.z = 0;
        this.flightClock = 0;
        this.nextWaveAt = this.randomWaveDelay();
      }
      return;
    }

    if (this.flightClock >= this.nextWaveAt) {
      this.isWaving = true;
      this.waveTimer = 0;
      return;
    }

    const waypoint = this.getRouteWaypoint(this.flyTarget);
    this.steerToward(waypoint, delta);

    const distToWaypoint = waypoint.distanceTo(this.modelRoot!.position);
    if (distToWaypoint < 14) {
      if (this.routeQueue.length > 1) this.advanceRoute();
      else this.pickNewFlightTarget();
    }
  }

  /** PROCEDURAL FALLBACK: hover - the bot notices the cursor, pauses in
   *  place, and reacts. No morph targets/blendshapes exist on this model for
   *  a real facial smile, so "happy" is a head tilt instead. */
  private updateHoverProcedural() {
    this.velocity.set(0, 0, 0);
    const t = this.clock.elapsedTime;
    if (this.headNode) {
      this.headNode.rotation.z = Math.sin(t * 3) * 0.12;
    } else {
      this.modelRoot!.rotation.z = Math.sin(t * 3) * 0.06;
    }
  }

  /** PROCEDURAL FALLBACK: typing - fly to a parked spot and hover there
   *  (gentle head bob) for the duration, rather than roaming freely. */
  private updateTypingProcedural(delta: number) {
    const parkPoint = this.chatOpen ? this.computeChatParkPoint() : this.typingParkPoint;
    const waypoint = this.getRouteWaypoint(parkPoint);
    const distToWaypoint = waypoint.distanceTo(this.modelRoot!.position);

    if (distToWaypoint > 10) {
      this.steerToward(waypoint, delta);
      if (distToWaypoint < 14) this.advanceRoute();
      return;
    }

    if (this.routeQueue.length > 1) {
      this.advanceRoute();
      return;
    }

    this.velocity.set(0, 0, 0);
    this.modelRoot!.rotation.z = THREE.MathUtils.lerp(this.modelRoot!.rotation.z, 0, delta * 5);
    const t = this.clock.elapsedTime;
    if (this.headNode) this.headNode.rotation.x = Math.sin(t * 5) * 0.1;
  }

  /** Shared steering: eases velocity toward `target`, moves modelRoot, and
   *  banks/pitches the body to face its direction of travel. */
  private steerToward(target: THREE.Vector3, delta: number) {
    const root = this.modelRoot!;
    const toTarget = target.clone().sub(root.position);
    if (toTarget.lengthSq() < 1) return;

    const desired = toTarget.normalize().multiplyScalar(this.flySpeed);
    this.velocity.lerp(desired, delta * 2);
    root.position.addScaledVector(this.velocity, delta);

    const targetRoll = THREE.MathUtils.clamp(-this.velocity.x * 0.01, -0.5, 0.5);
    const targetPitch = THREE.MathUtils.clamp(this.velocity.y * 0.01, -0.3, 0.3);
    root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, targetRoll, delta * 3);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetPitch, delta * 3);
  }

  /** Continuous wing flap while flying (faster with speed, gentle idle flap
   *  when paused/parked). Falls back to a subtle scale-pulse when the model
   *  has no wing-named parts at all. */
  private flapWings(delta: number) {
    const speedFactor = THREE.MathUtils.clamp(this.velocity.length() / this.flySpeed, 0.25, 1);
    const t = this.clock.elapsedTime;
    const flapSpeed = 6 + speedFactor * 10;
    const flap = Math.sin(t * flapSpeed) * 0.5 * speedFactor;
    const hasWings = !!(this.wingUpL || this.wingUpR || this.wingDownL || this.wingDownR);

    if (hasWings) {
      if (this.wingUpL) this.wingUpL.rotation.z = flap;
      if (this.wingUpR) this.wingUpR.rotation.z = -flap;
      if (this.wingDownL) this.wingDownL.rotation.z = -flap * 0.7;
      if (this.wingDownR) this.wingDownR.rotation.z = flap * 0.7;
    } else if (this.modelRoot && this.currentState === 'idle') {
      const pulse = 1 + Math.sin(t * flapSpeed) * 0.02 * speedFactor;
      this.modelRoot.scale.copy(this.baseScale).multiplyScalar(pulse);
    }
  }
}
