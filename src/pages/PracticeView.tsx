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
} from "ionicons/icons";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useHistory, useParams } from "react-router-dom";
import { getCards, getDueCards, reviewCard } from "../lib/Database";
import {
  FLY_DURATION,
  flightEnd,
  isTap,
  isThrow,
  landingSide,
  swipeProgress,
  velocity,
  type Point,
  type Sample,
} from "../lib/Swipe";
import type { Card } from "../models/Card";
import "./PracticeView.css";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CARD_HEIGHT = 280;

// Fracción del ancho de pantalla que la tarjeta recorre para que un lado se encienda del todo
const SIDE_RANGE = 0.35;

//Duración de la recompensa de acierto, igual a la animación más larga del CSS
const HIT_DURATION = 720;

// Cuánto crece el contador de la barra inferior cuando la tarjeta llega a su lado
const ICON_GROW = 0.9;

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

const PracticeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<SessionResults>({ remembered: 0, forgotten: 0 });
  const [toast, setToast] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const glowLeftRef = useRef<HTMLDivElement>(null);
  const glowRightRef = useRef<HTMLDivElement>(null);
  const iconLeftRef = useRef<HTMLSpanElement>(null);
  const iconRightRef = useRef<HTMLSpanElement>(null);
  const countLeftRef = useRef<HTMLSpanElement>(null);
  const countRightRef = useRef<HTMLSpanElement>(null);
  const liveLeftRef = useRef<HTMLIonIconElement>(null);
  const liveRightRef = useRef<HTMLIonIconElement>(null);
  const liveNumLeftRef = useRef<HTMLSpanElement>(null);
  const liveNumRightRef = useRef<HTMLSpanElement>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liftRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const cardCenterX = useRef(0); //centro de la tarjeta en pantalla al empezar el arrastre
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

  /**
   * Arma la cola de la sesión: lo pendiente en orden aleatorio, y si no hay
   * nada pendiente, todo el mazo. La práctica no termina sola: cada vez que
   * la cola se agota se vuelve a armar, y el usuario decide cuándo parar.
   */
  async function load(fresh: boolean) {
    setLoading(true);
    setFlipped(false);
    animateFlip.current = false;
    if (fresh) setResults({ remembered: 0, forgotten: 0 });
    try {
      const deckId = Number(id);
      const all = await getCards(deckId);

      //Sin pendientes se sigue con el mazo completo, así siempre hay algo que practicar
      const due = await getDueCards(deckId, new Date());
      const queue = shuffle(due.length > 0 ? due : all);
      setCards(queue);
      cardsRef.current = queue;
      setIndex(0);
      indexRef.current = 0;
    } catch (err) {
      setToast(`No se pudieron cargar las tarjetas: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => { if (hitTimer.current) clearTimeout(hitTimer.current); }, []);

  const current = cards[index];
  const next = cards[index + 1];
  const empty = !loading && cards.length === 0;

  function move(x: number, y: number, deg: number, transition = "none") {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg)`;
  }

  /**
   * Enciende un lado según lo cerca que esté la tarjeta: p va de -1 (izquierda)
   * a 1 (derecha). El resplandor sube su opacidad, y el ícono de ese lado en la
   * barra superior baja, crece y revela su copia de color sobre la gris. Se
   * escribe directo en el DOM para seguir el dedo sin pasar por React.
   */
  function showSides(p: number) {
    const right = Math.max(0, p);
    const left = Math.max(0, -p);
    const pose = (v: number) => `scale(${1 + v * ICON_GROW})`;

    if (glowRightRef.current) glowRightRef.current.style.opacity = String(right);
    if (glowLeftRef.current) glowLeftRef.current.style.opacity = String(left);
    if (liveRightRef.current) liveRightRef.current.style.opacity = String(right);
    if (liveLeftRef.current) liveLeftRef.current.style.opacity = String(left);
    if (liveNumRightRef.current) liveNumRightRef.current.style.opacity = String(right);
    if (liveNumLeftRef.current) liveNumLeftRef.current.style.opacity = String(left);
    if (countRightRef.current) countRightRef.current.style.transform = pose(right);
    if (countLeftRef.current) countLeftRef.current.style.transform = pose(left);
  }

  //Recompensa de acierto: salto del check, anillo, destello del resplandor, salto del contador y una vibración ligera
  function celebrate() {
    const side = iconRightRef.current;
    const glow = glowRightRef.current;
    if (!side || !glow) return;

    // Reiniciar las clases permite repetir la animación aunque el golpe anterior no haya terminado
    side.classList.remove("is-hit");
    glow.classList.remove("is-hit");
    void side.offsetWidth;
    side.classList.add("is-hit");
    glow.classList.add("is-hit");

    const count = countRightRef.current;
    if (count) {
      count.classList.remove("is-bumped");
      void count.offsetWidth;
      count.classList.add("is-bumped");
    }

    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

    if (hitTimer.current) clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => {
      side.classList.remove("is-hit");
      glow.classList.remove("is-hit");
      count?.classList.remove("is-bumped");
    }, HIT_DURATION);
  }

  //La tarjeta se levanta al tocarla y vuelve a posarse al soltarla
  function setLifted(on: boolean) {
    liftRef.current?.classList.toggle("is-held", on);
  }

  function snapBack() {
    move(0, 0, 0, "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)");
    showSides(0);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    velBuf.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    setLifted(true);

    // Antes de moverla la tarjeta está en su sitio, así que este es su centro real
    const rect = e.currentTarget.getBoundingClientRect();
    cardCenterX.current = rect.left + rect.width / 2;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || busy.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    move(dx, dy, dx * 0.10);

    //El lado se enciende según cuánto del ancho de pantalla lleva recorrido la tarjeta
    showSides(swipeProgress(dx, window.innerWidth * SIDE_RANGE));

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
    setLifted(false);

    const speed = Math.sqrt(vx * vx + vy * vy);
    const dist = Math.sqrt(dx * dx + dy * dy);

    //Un toque voltea la tarjeta
    if (isTap(dist, speed)) {
      animateFlip.current = true;
      setFlipped((f) => !f);
      return;
    }

    // Un arrastre corto y lento no es un lanzamiento: la tarjeta vuelve a su sitio
    if (!isThrow(dist, speed)) {
      snapBack();
      return;
    }

    //Lanzamiento libre: la tarjeta vuela hacia donde se lanzó, y el lado en que
    //cae respecto a la mitad de la pantalla decide si fue recordada u olvidada
    const end = flightEnd(dx, dy, vx, vy);
    const side = landingSide(cardCenterX.current + end.x, window.innerWidth);
    rate(side === "right", end);
  }

  function onPointerCancel() {
    if (!dragStart.current) return;
    dragStart.current = null;
    velBuf.current = [];
    setLifted(false);
    snapBack();
  }

  /**
   * Califica la tarjeta actual: guarda el resultado con SM-2 mientras la
   * tarjeta sale volando hasta el punto donde termina el lanzamiento. Si se
   * olvidó, vuelve al final de la cola para repetirla en la misma sesión.
   */
  function rate(remembered: boolean, end: Point) {
    const card = cardsRef.current[indexRef.current];
    if (!card || busy.current) return;

    // El lado elegido queda encendido del todo durante el vuelo
    showSides(remembered ? 1 : -1);
    if (remembered) celebrate();

    flyAway(end, async () => {
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
    });
  }

  // Anima la tarjeta hasta el punto final, guarda mientras vuela y trae la siguiente
  async function flyAway(end: Point, apply: () => Promise<void>) {
    busy.current = true;
    const SWAP_AT = 180; //cambiar el contenido cuando la tarjeta ya salió de pantalla

    //La inclinación acompaña al lado hacia el que vuela, con tope para que no gire de más
    const endTilt = Math.sign(end.x) * Math.min(Math.abs(end.x) * 0.05, 30);
    move(end.x, end.y, endTilt, `transform ${FLY_DURATION}ms cubic-bezier(0.2, 0, 0.4, 1)`);

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
      showSides(0);
      const nextIdx = indexRef.current + 1;

      //Al agotar la cola se vuelve a armar sin reiniciar los contadores
      if (nextIdx >= cardsRef.current.length) {
        busy.current = false;
        load(false);
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

          //El estirón va en el contenedor interno para no pelear con la transición del envoltorio
          const lift = liftRef.current;
          if (lift) {
            lift.classList.remove("is-entering");
            void lift.offsetWidth;
            lift.classList.add("is-entering");
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
      <IonContent scrollY={false} className="practice">
        {/* Resplandores de borde, detrás de la tarjeta */}
        {!empty && current && (
          <>
            <div ref={glowLeftRef} className="practice-glow practice-glow--left" />
            <div ref={glowRightRef} className="practice-glow practice-glow--right" />
          </>
        )}

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

        {/* Contadores de la sesión, abajo: olvidadas a la izquierda y recordadas a la derecha */}
        {!empty && current && (
          <div style={{
            position: "absolute",
            bottom: "calc(var(--ion-safe-area-bottom) + 22px)",
            left: 0, right: 0,
            margin: 0,
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 48,
            fontSize: "0.95rem",
            color: "var(--ion-color-medium)",
            pointerEvents: "none",
          }}>
            <span ref={countLeftRef} className="practice-count" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span ref={iconLeftRef} className="practice-bar-icon practice-bar-icon--left">
                <IonIcon icon={closeCircleOutline} className="practice-bar-icon__copy practice-bar-icon__copy--idle" />
                <IonIcon ref={liveLeftRef} icon={closeCircleOutline} className="practice-bar-icon__copy practice-bar-icon__copy--live" />
              </span>
              <span className="practice-bar-number">
                <span className="practice-bar-number__copy practice-bar-number__copy--idle">{results.forgotten}</span>
                <span ref={liveNumLeftRef} className="practice-bar-number__copy practice-bar-number__copy--live practice-bar-number__copy--left">{results.forgotten}</span>
              </span>
            </span>
            <span ref={countRightRef} className="practice-count" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span ref={iconRightRef} className="practice-bar-icon practice-bar-icon--right">
                <IonIcon icon={checkmarkCircleOutline} className="practice-bar-icon__copy practice-bar-icon__copy--idle" />
                <IonIcon ref={liveRightRef} icon={checkmarkCircleOutline} className="practice-bar-icon__copy practice-bar-icon__copy--live" />
              </span>
              <span className="practice-bar-number">
                <span className="practice-bar-number__copy practice-bar-number__copy--idle">{results.remembered}</span>
                <span ref={liveNumRightRef} className="practice-bar-number__copy practice-bar-number__copy--live practice-bar-number__copy--right">{results.remembered}</span>
              </span>
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
                icon={closeCircleOutline}
                style={{ fontSize: 56, color: "var(--ion-color-medium)", marginBottom: 8 }}
              />
              <p style={{ color: "var(--ion-color-medium)" }}>
                No hay tarjetas en este mazo.
              </p>
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
                <div ref={liftRef} className="practice-lift" style={{ perspective: "1200px", width: "100%", height: "100%", position: "relative" }}>
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
                      <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ion-color-medium)" }}>
                        Frente
                      </p>
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
