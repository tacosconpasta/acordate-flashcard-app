import { useRef, useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonText,
  IonSpinner,
  IonIcon,
  IonActionSheet,
} from "@ionic/react";
import {
  cameraOutline,
  imageOutline,
  personOutline,
  trashOutline,
} from "ionicons/icons";
import { Camera } from "@capacitor/camera";
import { useHistory } from "react-router-dom";
import { initDatabase, insertUser, seedExampleData } from "../lib/Database";

const Onboarding: React.FC = () => {
  const history = useHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function openCamera() {
    try {
      const result = await Camera.takePhoto({ quality: 80 });
      if (!result.webPath) return;
      const blob = await fetch(result.webPath).then((r) => r.blob());
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      setImage(dataUrl);
    } catch {
      // cancelled
    }
  }

  async function handleStart() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe tu nombre.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await initDatabase();
      const userId = await insertUser({ name: trimmed, image });
      await seedExampleData(userId);
      history.replace("/home");
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonContent
        style={
          {
            "--padding-top": "calc(20px + var(--ion-safe-area-top))",
            "--padding-bottom": "calc(20px + var(--ion-safe-area-bottom))",
            "--padding-start": "24px",
            "--padding-end": "24px",
          } as React.CSSProperties
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100%",
            gap: 28,
            paddingTop: 40,
            paddingBottom: 40,
          }}
        >
          {/* Welcome */}
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              ¡Bien podei' Acordate, vo'!
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                color: "var(--ion-color-medium)",
                lineHeight: 1.5,
              }}
            >
              Personaliza tu perfil para empezar.
            </p>
          </div>

          {/* Avatar picker */}
          <div
            onClick={() => setShowImageSheet(true)}
            style={{
              position: "relative",
              width: 140,
              height: 140,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: image
                  ? "transparent"
                  : "var(--ion-color-primary-tint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              }}
            >
              {image ? (
                <img
                  src={image}
                  alt="Foto de perfil"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <IonIcon
                  icon={personOutline}
                  style={{ fontSize: 64, color: "var(--ion-color-primary)" }}
                />
              )}
            </div>

            {/* Camera badge — outside the clipped circle */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--ion-color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.20)",
                border: "3px solid var(--ion-background-color)",
              }}
            >
              <IonIcon
                icon={cameraOutline}
                style={{ fontSize: 20, color: "white" }}
              />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onPickFile}
          />

          {/* Name */}
          <div style={{ width: "100%", maxWidth: 400 }}>
            <IonItem
              lines="full"
              style={
                {
                  "--background": "transparent",
                  "--padding-start": "0",
                } as React.CSSProperties
              }
            >
              <IonInput
                label="Ingrese su nombre aquí"
                labelPlacement="floating"
                value={name}
                placeholder="Ej. Maria"
                onIonInput={(e) => setName(e.detail.value ?? "")}
                autocapitalize="words"
                autocomplete="given-name"
              />
            </IonItem>
            {error && (
              <IonText color="danger">
                <p style={{ margin: "8px 4px 0", fontSize: "0.85rem" }}>
                  {error}
                </p>
              </IonText>
            )}
          </div>

          {/* Start button */}
          <IonButton
            expand="block"
            disabled={saving || !name.trim()}
            onClick={handleStart}
            style={{ width: "100%", maxWidth: 400, marginTop: 4 }}
          >
            {saving ? <IonSpinner name="crescent" /> : "Empezar"}
          </IonButton>
        </div>

        {/* Image source action sheet */}
        <IonActionSheet
          isOpen={showImageSheet}
          onDidDismiss={() => setShowImageSheet(false)}
          header="Foto de perfil"
          buttons={[
            {
              text: "Camara",
              icon: cameraOutline,
              handler: () => {
                openCamera();
              },
            },
            {
              text: "Galeria",
              icon: imageOutline,
              handler: () => {
                fileInputRef.current?.click();
              },
            },
            ...(image
              ? [
                  {
                    text: "Eliminar foto",
                    icon: trashOutline,
                    role: "destructive" as const,
                    handler: () => {
                      setImage(null);
                    },
                  },
                ]
              : []),
            {
              text: "Cancelar",
              role: "cancel" as const,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;
