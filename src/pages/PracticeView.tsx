import { useEffect, useRef, useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
} from "@ionic/react";
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  timeOutline,
} from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import { getCards, getDueCards, reviewCard } from "../lib/Database";
import { SM2 } from "../lib/SM2";
import { describeDate } from "../lib/ProgressFormat";
import { decideSwipe, isTap, velocity, type Sample } from "../lib/Swipe";
import type { Card } from "../models/Card";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Las tarjetas en repaso van primero, mezcladas, y las nuevas al final en orden de creación
function buildQueue(cards: Card[], sm2: SM2): Card[] {
  const fresh = cards.filter((c) => sm2.isNew(c));
  const rest = cards.filter((c) => !sm2.isNew(c));
  return [...shuffle(rest), ...fresh];
}

const CARD_HEIGHT = 280;

const FACE_BASE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden" as React.CSSProperties["backfaceVisibility"],
  borderRadius: 24,
  display: "flex",
  flexDirection: "column",
  padding: "20px 20px 16px",
};

//Conteo de la sesión actual, se reinicia con cada carga
interface SessionResults {
  remembered: number;
  forgotten: number;
}

// "pendientes" es la sesión normal; "todas" repasa el mazo completo sin importar fechas
type Mode = "pendientes" | "todas";

const PracticeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<Mode>("pendientes");
  const [results, setResults] = useState<SessionResults>({ remembered: 0, forgotten: 0 });
  const [nextDue, setNextDue] = useState<Date | null>(null);
  const [totalInDeck, setTotalInDeck] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const velBuf = useRef<Sample[]>([]);
  const busy = useRef(false);
  const flippedRef = useRef(false);
  const animateFlip = useRef(false);
  const indexRef = useRef(0);
  const cardsRef = useRef<Card[]>([]);

  //Los manejadores de puntero leen refs para no quedarse con un estado viejo
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // Carga la cola de la sesión: solo las pendientes, o todo el mazo si se pide
  async function load(nextMode: Mode) {
    setLoading(true);
    setFlipped(false);
    animateFlip.current = false;
    setResults({ remembered: 0, forgotten: 0 });
    try {
      const deckId = Number(id);
      const all = await getCards(deckId);
      setTotalInDeck(all.length);
      const now = new Date();
      const sm2 = new SM2(now);

      //El próximo vencimiento se calcula sobre todo el mazo, para la pantalla "Estás al día"
      setNextDue(sm2.nextDueDate(all));

      const source = nextMode === "todas" ? all : await getDueCards(deckId, now);
      const queue = buildQueue(source, sm2);
      setCards(queue);
      cardsRef.current = queue;
      setIndex(0);
      indexRef.current = 0;
      setMode(nextMode);
    } catch (err) {
      setToast(`No se pudieron cargar las tarjetas: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("pendientes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const current = cards[index];
  const next = cards[index + 1];
  const remaining = Math.max(cards.length - index, 0);
  const empty = !loading && cards.length === 0;
  const sm2 = new SM2();

  function move(x: number, y: number, deg: number, transition = "none") {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg)`;
  }

  function snapBack() {
    move(0, 0, 0, "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)");
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    velBuf.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || busy.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    move(dx, dy, dx * 0.10);

    // Solo se guardan las últimas muestras, para que la velocidad refleje el final del gesto
    const buf = velBuf.current;
    buf.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (buf.length > 6) buf.shift();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || busy.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const { vx, vy } = velocity(velBuf.current);
    dragStart.current = null;
    velBuf.current = [];

    const speed = Math.sqrt(vx * vx + vy * vy);
    const dist = Math.sqrt(dx * dx + dy * dy);

    //Un toque voltea la tarjeta
    if (isTap(dist, speed)) {
      animateFlip.current = true;
      setFlipped((f) => !f);
      return;
    }

    // Sin ver la respuesta no se califica: un gesto fuerte solo la voltea
    if (!flippedRef.current) {
      const strong = speed > 0.45 || dist > 40;
      move(0, 0, 0, "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)");
      if (strong) {
        setTimeout(() => { animateFlip.current = true; setFlipped(true); }, 80);
      }
      return;
    }

    //Con la respuesta visible: derecha es recordada, izquierda es olvidada
    const direction = decideSwipe(dx, dy, vx, vy);
    if (direction === "none") {
      snapBack();
    } else {
      rate(direction === "right", dx, dy, vx, vy);
    }
  }

  function onPointerCancel() {
    if (!dragStart.current) return;
    dragStart.current = null;
    velBuf.current = [];
    snapBack();
  }

  /**
   * Califica la tarjeta actual: guarda el resultado con SM-2 mientras la
   * tarjeta sale volando hacia el lado correspondiente. Si se olvidó, vuelve
   * al final de la cola para repetirla en la misma sesión.
   */
  function rate(remembered: boolean, dx: number, dy: number, vx: number, vy: number) {
    const card = cardsRef.current[indexRef.current];
    if (!card || busy.current) return;

    //Se fuerza un mínimo de desplazamiento y velocidad hacia el lado elegido
    const side = remembered ? 1 : -1;
    flyAway(
      side * Math.max(Math.abs(dx), 80),
      dy,
      side * Math.max(Math.abs(vx), 0.9),
      vy,
      async () => {
        let updated = card;
        try {
          updated = await reviewCard(card, remembered);
        } catch (err) {
          setToast(`No se pudo guardar el repaso: ${String(err)}`);
        }

        // La cola guarda la versión actualizada; una olvidada además se repite al final
        const queue = cardsRef.current.map((c) => (c.id === updated.id ? updated : c));
        if (!remembered) {
          queue.push(updated);
        }
        cardsRef.current = queue;
        setCards(queue);
        setResults((r) =>
          remembered
            ? { ...r, remembered: r.remembered + 1 }
            : { ...r, forgotten: r.forgotten + 1 }
        );
      }
    );
  }

  async function flyAway(
    dx: number,
    dy: number,
    vx: number,
    vy: number,
    apply: () => Promise<void>
  ) {
    busy.current = true;
    const FLY_DURATION = 400;
    const SWAP_AT = 180; //cambiar el contenido cuando la tarjeta ya salió de pantalla

    const speed = Math.sqrt(vx * vx + vy * vy);
    let endX: number, endY: number;
    if (speed > 0.05) {
      endX = dx + vx * FLY_DURATION * 1.4;
      endY = dy + vy * FLY_DURATION * 1.4;
    } else {
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      endX = (dx / len) * 700;
      endY = (dy / len) * 700;
    }

    const endTilt = Math.sign(endX) * Math.min(Math.abs(endX) * 0.05, 30);
    move(endX, endY, endTilt, `transform ${FLY_DURATION}ms cubic-bezier(0.2, 0, 0.4, 1)`);

    // El guardado corre durante el vuelo; si tarda más que la animación se espera a que termine
    const started = Date.now();
    await apply();
    const wait = Math.max(0, SWAP_AT - (Date.now() - started));

    setTimeout(() => {
      const el = wrapperRef.current;
      if (el) {
        el.style.transition = "none";
        el.style.transform = "translate(0px, 28px) scale(0.88)";
        el.style.opacity = "0";
      }

      animateFlip.current = false;
      setFlipped(false);
      const nextIdx = indexRef.current + 1;

      //Al agotar la cola se vuelve a consultar la base: lo recordado ya no está pendiente
      if (nextIdx >= cardsRef.current.length) {
        busy.current = false;
        load("pendientes");
        return;
      }
      setIndex(nextIdx);
      indexRef.current = nextIdx;

      // Doble RAF: el primero deja que React pinte la nueva tarjeta, el segundo lanza la transición
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = wrapperRef.current;
          if (el) {
            el.style.transition =
              "transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease";
            el.style.transform = "translate(0px, 0px) scale(1)";
            el.style.opacity = "1";
          }
          busy.current = false;
        });
      });
    }, wait);
  }

  //Sacudir el teléfono voltea la tarjeta cuando la respuesta está oculta
  useEffect(() => {
    let lastShake = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    let primed = false;
    const SHAKE_DELTA = 28; // m/s² de cambio entre muestras
    const COOLDOWN = 900;

    function onMotion(e: DeviceMotionEvent) {
      if (busy.current) return;
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x ?? 0, y = acc.y ?? 0, z = acc.z ?? 0;

      if (!primed) {
        lastX = x; lastY = y; lastZ = z;
        primed = true;
        return;
      }

      const dx = x - lastX, dy = y - lastY, dz = z - lastZ;
      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
      lastX = x; lastY = y; lastZ = z;

      if (delta > SHAKE_DELTA) {
        const now = Date.now();
        if (now - lastShake > COOLDOWN) {
          lastShake = now;
          if (!cardsRef.current[indexRef.current] || flippedRef.current) return;
          animateFlip.current = true;
          setFlipped(true);
        }
      }
    }

    const DME = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === "function") {
      DME.requestPermission()
        .then((res) => {
          if (res === "granted") window.addEventListener("devicemotion", onMotion);
        })
        .catch(() => {});
    } else {
      window.addEventListener("devicemotion", onMotion);
    }

    return () => window.removeEventListener("devicemotion", onMotion);
  }, []);

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent scrollY={false}>
        {/* Botón de volver */}
        <div style={{
          position: "absolute",
          top: "calc(var(--ion-safe-area-top) + 10px)",
          left: 8,
          zIndex: 50,
        }}>
          <IonButton fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={arrowBackOutline} slot="icon-only" />
          </IonButton>
        </div>

        {/* Progreso de la sesión: recordadas, restantes, olvidadas */}
        {!empty && current && (
          <div style={{
            position: "absolute",
            top: "calc(var(--ion-safe-area-top) + 18px)",
            left: 0, right: 0,
            margin: 0,
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
            fontSize: "0.85rem",
            color: "var(--ion-color-medium)",
            pointerEvents: "none",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--ion-color-success)" }}>
              <IonIcon icon={checkmarkCircleOutline} /> {results.remembered}
            </span>
            <span>{remaining} {remaining === 1 ? "restante" : "restantes"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--ion-color-danger)" }}>
              <IonIcon icon={closeCircleOutline} /> {results.forgotten}
            </span>
          </div>
        )}

        {/* Área principal */}
        <div style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "calc(var(--ion-safe-area-top) + 60px)",
          paddingBottom: "calc(var(--ion-safe-area-bottom) + 60px)",
          paddingLeft: 24,
          paddingRight: 24,
          boxSizing: "border-box",
        }}>
          {empty ? (
            <div style={{ textAlign: "center", maxWidth: 320 }}>
              <IonIcon
                icon={totalInDeck === 0 ? closeCircleOutline : timeOutline}
                style={{ fontSize: 56, color: "var(--ion-color-medium)", marginBottom: 8 }}
              />
              {totalInDeck === 0 ? (
                <p style={{ color: "var(--ion-color-medium)" }}>
                  No hay tarjetas en este mazo.
                </p>
              ) : (
                <>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "1.2rem" }}>
                    Estás al día
                  </p>
                  <p style={{ margin: "0 0 20px", color: "var(--ion-color-medium)" }}>
                    {nextDue
                      ? `La próxima tarjeta vence ${describeDate(nextDue, new Date())}.`
                      : "No hay tarjetas programadas."}
                  </p>
                  <IonButton expand="block" fill="outline" onClick={() => load("todas")}>
                    <IonIcon icon={refreshOutline} slot="start" />
                    Repasar todo el mazo
                  </IonButton>
                </>
              )}
              <IonButton expand="block" fill="clear" onClick={() => history.goBack()}>
                Volver
              </IonButton>
            </div>
          ) : !current ? (
            <IonSpinner name="crescent" />
          ) : (
            <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
              {/* Siguiente tarjeta asomando detrás */}
              {next && (
                <div style={{
                  position: "absolute",
                  left: 0, right: 0, top: 0,
                  height: CARD_HEIGHT,
                  background: "var(--ion-card-background, var(--ion-item-background))",
                  borderRadius: 24,
                  transform: "scale(0.94) translateY(14px)",
                  filter: "blur(3px)",
                }} />
              )}

              {/* Contenedor arrastrable */}
              <div
                ref={wrapperRef}
                style={{
                  height: CARD_HEIGHT,
                  position: "relative",
                  zIndex: 1,
                  borderRadius: 24,
                  boxShadow: "0 6px 28px rgba(0,0,0,0.13)",
                  willChange: "transform",
                  cursor: "grab",
                  touchAction: "none",
                  userSelect: "none",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
              >
                <div style={{ perspective: "1200px", width: "100%", height: "100%", position: "relative" }}>
                  <div style={{
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: animateFlip.current ? "transform 0.5s ease" : "none",
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    position: "relative",
                  } as React.CSSProperties}>
                    {/* Cara frontal */}
                    <div style={{ ...FACE_BASE, background: "var(--ion-card-background, var(--ion-item-background))" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ion-color-medium)" }}>
                          Frente
                        </p>
                        {sm2.isNew(current) && (
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--ion-color-primary)",
                            background: "var(--ion-color-primary-tint)",
                            padding: "2px 8px",
                            borderRadius: 8,
                          }}>
                            Nueva
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, textAlign: "center" }}>
                          {current.front}
                        </p>
                      </div>
                    </div>

                    {/* Cara trasera */}
                    <div style={{ ...FACE_BASE, transform: "rotateY(180deg)", background: "var(--ion-color-primary)" }}>
                      <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
                        Reverso
                      </p>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, textAlign: "center", color: "white" }}>
                          {current.back}
                        </p>
                      </div>
                      {current.description ? (
                        <p style={{ margin: 0, fontSize: "0.85rem", textAlign: "center", color: "rgba(255,255,255,0.75)" }}>
                          {current.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pista de uso */}
        {!empty && current && (
          <p style={{
            position: "absolute",
            bottom: "calc(var(--ion-safe-area-bottom) + 20px)",
            left: 0, right: 0,
            margin: 0,
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--ion-color-medium)",
            pointerEvents: "none",
          }}>
            {flipped
              ? "Desliza a la derecha si la recordaste, a la izquierda si no"
              : `Toca para ver la respuesta${mode === "todas" ? " · todo el mazo" : ""}`}
          </p>
        )}

        <IonToast
          isOpen={toast !== null}
          message={toast ?? ""}
          duration={3000}
          color="danger"
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default PracticeView;
