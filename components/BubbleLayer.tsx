import { useEffect, useRef } from 'react';

// ─── Bubble spec (static config) ────────────────────────────────────────────

interface BSpec {
    id: number;
    startX: number;   // % from left (0–100)
    size: number;     // diameter px
    speed: number;    // vh / second
    delay: number;    // seconds before appearing (negative y offset)
    fadeAt: number | null; // vh from bottom to disappear (null = reach top)
    driftAmp: number; // px of sinusoidal horizontal drift
    phase: number;    // sine phase offset
}

// Pre-choreographed so that:
//   Bubble 0 (x=22,speed=7) & Bubble 5 (x=22,speed=9,delay=2) meet at y≈63vh
//   Bubble 2 (x=60,speed=9,delay=2) & Bubble 7 (x=61,speed=7) meet at y≈63vh
const SPECS: BSpec[] = [
    // ── 5 that REACH THE TOP ────────────────────────────────────────────────
    { id: 0, startX: 22, size: 6, speed: 7, delay: 0.0, fadeAt: null, driftAmp: 0, phase: 0 },
    { id: 1, startX: 38, size: 5, speed: 9, delay: 3.5, fadeAt: null, driftAmp: 3, phase: 1.2 },
    { id: 2, startX: 60, size: 7, speed: 9, delay: 2.0, fadeAt: null, driftAmp: 0, phase: 2.4 },
    { id: 3, startX: 78, size: 5, speed: 8, delay: 5.5, fadeAt: null, driftAmp: 3, phase: 0.8 },
    { id: 4, startX: 92, size: 6, speed: 7, delay: 8.0, fadeAt: null, driftAmp: 2, phase: 1.6 },
    // ── 5 that FADE at specific heights ─────────────────────────────────────
    { id: 5, startX: 22, size: 5, speed: 9, delay: 2.0, fadeAt: 80, driftAmp: 0, phase: 3.0 }, // merge pair A with id=0
    { id: 6, startX: 45, size: 4, speed: 8, delay: 4.5, fadeAt: 40, driftAmp: 2, phase: 0.4 },
    { id: 7, startX: 61, size: 6, speed: 7, delay: 0.0, fadeAt: 70, driftAmp: 0, phase: 1.8 }, // merge pair B with id=2
    { id: 8, startX: 10, size: 5, speed: 9, delay: 6.5, fadeAt: 20, driftAmp: 2, phase: 2.2 },
    { id: 9, startX: 85, size: 4, speed: 8, delay: 2.8, fadeAt: 60, driftAmp: 2, phase: 0.6 },
];

// ─── Mutable runtime state ───────────────────────────────────────────────────

interface BState {
    spec: BSpec;
    y: number;          // vh from bottom (0 = screen bottom, 100 = screen top)
    x: number;          // % from left (current, after drift)
    size: number;       // current diameter px (lerps on merge)
    targetSize: number; // lerp target
    opacity: number;
    active: boolean;
    mergedInto: number; // id of winner bubble (-1 = not merged)
    mergeTimer: number; // seconds until restart after merge
}

const LERP = (a: number, b: number, t: number) => a + (b - a) * Math.min(t, 1);
const MERGE_PX_THRESHOLD = 14; // pixel distance to trigger merge
const FADE_RANGE_VH = 12;      // vh over which fading in/out occurs
const MAX_OPACITY = 0.50;      // keep very subtle

// ─── Component ───────────────────────────────────────────────────────────────

export const BubbleLayer = () => {
    const elRefs = useRef<(HTMLSpanElement | null)[]>(Array(SPECS.length).fill(null));

    const stateRef = useRef<BState[]>(
        SPECS.map(spec => ({
            spec,
            y: -(spec.delay * spec.speed),
            x: spec.startX,
            size: spec.size,
            targetSize: spec.size,
            opacity: 0,
            active: true,
            mergedInto: -1,
            mergeTimer: 0,
        }))
    );

    const rafRef = useRef<number>(0);
    const lastTs = useRef<number>(0);
    const vwRef = useRef(window.innerWidth);
    const vhRef = useRef(window.innerHeight);

    useEffect(() => {
        const onResize = () => {
            vwRef.current = window.innerWidth;
            vhRef.current = window.innerHeight;
        };
        window.addEventListener('resize', onResize);

        const tick = (ts: number) => {
            const dt = Math.min((ts - lastTs.current) / 1000, 0.1);
            lastTs.current = ts;

            const st = stateRef.current;
            const VW = vwRef.current;
            const VH = vhRef.current;

            // ── 1. Advance positions ─────────────────────────────────────
            for (const b of st) {
                // Waiting to restart after merge
                if (b.mergedInto >= 0) {
                    b.mergeTimer -= dt;
                    if (b.mergeTimer <= 0) {
                        b.mergedInto = -1;
                        b.active = true;
                        b.y = -(b.spec.delay * b.spec.speed);
                        b.x = b.spec.startX;
                        b.size = b.spec.size;
                        b.targetSize = b.spec.size;
                        const el = elRefs.current[b.spec.id];
                        if (el) { el.style.display = 'block'; el.style.opacity = '0'; }
                    }
                    continue;
                }

                if (!b.active) continue;

                // Rise
                b.y += b.spec.speed * dt;

                // Horizontal drift (sinusoidal)
                const yPos = Math.max(0, b.y);
                const drift = b.spec.driftAmp * Math.sin(yPos * 0.06 + b.spec.phase);
                b.x = Math.max(2, Math.min(98, b.spec.startX + drift));

                // Lerp size toward target (smooth merge grow)
                b.size = LERP(b.size, b.targetSize, dt * 5);

                // ── reset when done ──
                const limit = b.spec.fadeAt !== null ? b.spec.fadeAt : 105;
                if (b.y >= limit) {
                    b.y = -(b.spec.delay * b.spec.speed);
                    b.x = b.spec.startX;
                    b.targetSize = b.spec.size;
                    b.size = b.spec.size;
                }

                // ── opacity ──
                const y0 = Math.max(0, b.y);
                let opa = MAX_OPACITY;

                if (b.y <= 0) {
                    opa = 0;
                } else if (y0 < FADE_RANGE_VH) {
                    opa = (y0 / FADE_RANGE_VH) * MAX_OPACITY; // fade in
                } else if (b.spec.fadeAt !== null) {
                    const fs = b.spec.fadeAt - FADE_RANGE_VH;
                    if (y0 >= fs) opa = Math.max(0, 1 - (y0 - fs) / FADE_RANGE_VH) * MAX_OPACITY;
                } else {
                    // reaches top — fade out last 8vh
                    if (y0 >= 92) opa = Math.max(0, (100 - y0) / 8) * MAX_OPACITY;
                }

                b.opacity = opa;
            }

            // ── 2. Merge detection ───────────────────────────────────────
            for (let i = 0; i < st.length; i++) {
                const a = st[i];
                if (!a.active || a.mergedInto >= 0 || a.y <= 0) continue;

                for (let j = i + 1; j < st.length; j++) {
                    const b = st[j];
                    if (!b.active || b.mergedInto >= 0 || b.y <= 0) continue;

                    const dxPx = (a.x - b.x) / 100 * VW;
                    const dyPx = (a.y - b.y) / 100 * VH;
                    const dist = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

                    if (dist <= (a.size + b.size) / 2 + MERGE_PX_THRESHOLD) {
                        // Area-conserving merge: a wins, b is absorbed
                        const ra = a.size / 2, rb = b.size / 2;
                        a.targetSize = Math.min(Math.sqrt(ra * ra + rb * rb) * 2, 20);
                        b.mergedInto = a.spec.id;
                        b.active = false;
                        b.mergeTimer = 5; // seconds before b restarts
                        const elB = elRefs.current[b.spec.id];
                        if (elB) { elB.style.opacity = '0'; elB.style.display = 'none'; }
                    }
                }
            }

            // ── 3. Apply to DOM ──────────────────────────────────────────
            for (const b of st) {
                if (b.mergedInto >= 0) continue;
                const el = elRefs.current[b.spec.id];
                if (!el) continue;

                const xPx = b.x / 100 * VW - b.size / 2;
                const yPx = VH - (Math.max(0, b.y) / 100 * VH) - b.size / 2;

                el.style.transform = `translate(${xPx}px,${yPx}px)`;
                el.style.width = `${b.size}px`;
                el.style.height = `${b.size}px`;
                el.style.opacity = `${b.opacity}`;
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
                overflow: 'hidden',
            }}
        >
            {SPECS.map((spec, i) => (
                <span
                    key={spec.id}
                    ref={el => { elRefs.current[i] = el; }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle at 35% 35%, rgba(255,110,110,0.7), rgba(190,15,15,0.35))',
                        boxShadow: 'inset 0 0 4px rgba(255,255,255,0.3)',
                        opacity: 0,
                        willChange: 'transform, width, height, opacity',
                    }}
                />
            ))}
        </div>
    );
};
