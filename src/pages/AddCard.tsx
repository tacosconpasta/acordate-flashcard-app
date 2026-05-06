import { useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonButton,
  IonTextarea,
  IonText,
  IonSpinner,
} from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import { insertCard } from "../lib/Database";

const CARD_STYLE: React.CSSProperties = {};

const LABEL_STYLE: React.CSSProperties = {};

const AddCard: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const history = useHistory();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!front.trim()) next.front = "Escribe el frente de la tarjeta.";
    if (!back.trim()) next.back = "Escribe el reverso de la tarjeta.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await insertCard({
        front: front.trim(),
        back: back.trim(),
        description: description.trim(),
        last_practiced: null,
        deck_id: Number(deckId),
      });
      history.goBack();
    } catch (err) {
      setErrors({ front: String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>Cancelar</IonButton>
          </IonButtons>
          <IonTitle>Nueva tarjeta</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving} onClick={handleSave}>
              {saving ? <IonSpinner name="crescent" /> : "Guardar"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        style={
          {
            "--padding-top": "1.85rem",
            "--padding-bottom": "calc(28px + var(--ion-safe-area-bottom))",
            "--padding-start": "calc(20px + var(--ion-safe-area-left))",
            "--padding-end": "calc(20px + var(--ion-safe-area-right))",
          } as React.CSSProperties
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Front card Container (Card + Error) */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
          >
            {/* Card */}
            <div
              style={{
                background:
                  "var(--ion-card-background, var(--ion-item-background))",
                borderRadius: 20,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                minHeight: 190,
                outline: errors.front
                  ? "1px solid var(--ion-color-danger)"
                  : "none",
              }}
            >
              {/*Frente*/}
              <p
                style={{
                  padding: "0.5rem 0rem 0rem 1.25rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ion-color-medium)",
                }}
              >
                Frente
              </p>

              {/*Texto Ejemplo*/}
              <div
                style={{
                  height: "100%",
                  padding: "1rem",
                }}
              >
                <IonTextarea
                  placeholder="Ej. Hello"
                  value={front}
                  onIonInput={(e) => setFront(e.detail.value ?? "")}
                  autoGrow
                  style={
                    {
                      fontSize: "1.35rem",
                      fontWeight: 600,
                      textAlign: "center",
                      width: "100%",
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>

            {/* Error */}
            {errors.front && (
              <IonText color="danger">
                <p style={{ margin: "0px 4px 0", fontSize: "0.85rem" }}>
                  {errors.front}
                </p>
              </IonText>
            )}
          </div>

          {/* Back card Container (Card + Error) */}
          <div>
            {/* Card */}
            <div
              style={{
                background:
                  "var(--ion-card-background, var(--ion-item-background))",
                borderRadius: 20,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                minHeight: 190,
                outline: errors.back
                  ? "1px solid var(--ion-color-danger)"
                  : "none",
              }}
            >
              {/*Reverso*/}
              <p
                style={{
                  padding: "0.5rem 0rem 0rem 1.25rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ion-color-medium)",
                }}
              >
                Reverso
              </p>

              {/*Texto de Ejemplo*/}
              <div
                style={{
                  height: "100%",
                  padding: "1rem",
                }}
              >
                <IonTextarea
                  placeholder="Ej. Hola"
                  value={back}
                  onIonInput={(e) => setBack(e.detail.value ?? "")}
                  autoGrow
                  style={
                    {
                      fontSize: "1.35rem",
                      fontWeight: 600,
                      textAlign: "center",
                      width: "100%",
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {errors.back && (
            <IonText color="danger">
              <p style={{ margin: "0px 4px 0", fontSize: "0.85rem" }}>
                {errors.back}
              </p>
            </IonText>
          )}
        </div>

        {/* Description */}
        <IonTextarea
          placeholder="Descripcion (opcional)"
          value={description}
          onIonInput={(e) => setDescription(e.detail.value ?? "")}
          autoGrow
          rows={2}
          style={
            {
              marginTop: 20,
              fontSize: "0.95rem",
              color: "var(--ion-color-medium)",
              "--placeholder-color": "var(--ion-color-medium)",
            } as React.CSSProperties
          }
        />
      </IonContent>
    </IonPage>
  );
};

export default AddCard;
