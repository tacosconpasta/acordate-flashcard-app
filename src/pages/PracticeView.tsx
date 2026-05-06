import { useEffect, useRef, useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
} from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import { getCards } from "../lib/Database";
import type { Card } from "../models/Card";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

const PracticeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const velBuf = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const busy = useRef(false);
  const flippedRef = useRef(false);
  const animateFlip = useRef(false);
  const indexRef = useRef(0);
  const cardsRef = useRef<Card[]>([]);

  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  useEffect(() => {
    getCards(Number(id)).then((c) => {
      const shuffled = shuffle(c);
      setCards(shuffled);
      cardsRef.current = shuffled;
      setLoading(false);
    });
  }, [id]);

  const current = cards[index];
  const next = cards[index + 1];
  const empty = !loading && cards.length === 0;

  function move(x: number, y: number, deg: number, transition = "none") {
    const el = wrapperRef.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg)`;
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
    const buf = velBuf.current;
    buf.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (buf.length > 6) buf.shift();
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || busy.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const buf = velBuf.current;
    let vx = 0, vy = 0;
    if (buf.length >= 2) {
      const dt = buf[buf.length - 1].t - buf[0].t;
      if (dt > 0) {
        vx = (buf[buf.length - 1].x - buf[0].x) / dt;
        vy = (buf[buf.length - 1].y - buf[0].y) / dt;
      }
    }
    dragStart.current = null;
    velBuf.current = [];

    const speed = Math.sqrt(vx * vx + vy * vy);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10 && speed < 0.3) {
      animateFlip.current = true;
      setFlipped((f) => !f);
      return;
    }

    if (speed > 0.45 || dist > 120) {
      flyAway(dx, dy, vx, vy);
    } else if (Math.abs(dx) > Math.abs(dy) && dist > 40 && !flippedRef.current) {
      move(0, 0, 0, "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)");
      setTimeout(() => { animateFlip.current = true; setFlipped(true); }, 80);
    } else {
      move(0, 0, 0, "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)");
    }
  }

  function onPointerCancel() {
    if (!dragStart.current) return;
    dragStart.current = null;
    velBuf.current = [];
    move(0, 0, 0, "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)");
  }

  function flyAway(dx: number, dy: number, vx: number, vy: number) {
    busy.current = true;
    const FLY_DURATION = 400;
    const SWAP_AT = 180; // swap content once card is clearly off-screen

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
      if (nextIdx >= cardsRef.current.length) {
        const reshuffled = shuffle(cardsRef.current);
        cardsRef.current = reshuffled;
        setCards(reshuffled);
        setIndex(0);
        indexRef.current = 0;
      } else {
        setIndex(nextIdx);
        indexRef.current = nextIdx;
      }

      // Double RAF: first lets React flush the new card content, second triggers transition
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
    }, SWAP_AT);
  }

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
        {/* Back button */}
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

        {/* Progress */}
        {!empty && current && (
          <p style={{
            position: "absolute",
            top: "calc(var(--ion-safe-area-top) + 18px)",
            left: 0, right: 0,
            margin: 0,
            textAlign: "center",
            zIndex: 50,
            fontSize: "0.85rem",
            color: "var(--ion-color-medium)",
            pointerEvents: "none",
          }}>
            {index + 1} / {cards.length}
          </p>
        )}

        {/* Main area */}
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
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--ion-color-medium)" }}>
                No hay tarjetas en este mazo.
              </p>
              <IonButton onClick={() => history.goBack()}>Volver</IonButton>
            </div>
          ) : !current ? (
            <IonSpinner name="crescent" />
          ) : (
            <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
              {/* Next card peeking behind */}
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

              {/* Draggable wrapper */}
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
                    {/* Front face */}
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

                    {/* Back face */}
                    <div style={{ ...FACE_BASE, transform: "rotateY(180deg)", background: "var(--ion-color-primary)" }}>
                      <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
                        Reverso
                      </p>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, textAlign: "center", color: "white" }}>
                          {current.back}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hint */}
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
              ? "Lanza en cualquier dirección para continuar"
              : "Toca para ver respuesta · Lanza para descartar"}
          </p>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PracticeView;
