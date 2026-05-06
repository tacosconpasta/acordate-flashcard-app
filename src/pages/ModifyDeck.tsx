import { useEffect, useRef, useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonInput,
  IonTextarea,
  IonText,
  IonSpinner,
  IonActionSheet,
} from "@ionic/react";
import { cameraOutline, imageOutline, trashOutline } from "ionicons/icons";
import { Camera } from "@capacitor/camera";
import { useHistory, useParams } from "react-router-dom";
import { getDeckById, updateDeck } from "../lib/Database";
import type { Deck } from "../models/Deck";

const ModifyDeck: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; load?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const found = await getDeckById(Number(id));
        if (!found) { setErrors({ load: "Mazo no encontrado." }); return; }
        setDeck(found);
        setName(found.name);
        setDescription(found.description);
        setImage(found.image);
      } catch (err) {
        setErrors({ load: String(err) });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
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

  function validate(): boolean {
    const next: { name?: string } = {};
    if (!name.trim()) next.name = "El nombre es obligatorio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate() || !deck) return;
    setSaving(true);
    try {
      await updateDeck({
        ...deck,
        name: name.trim(),
        description: description.trim(),
        image: image ?? null,
      });
      history.goBack();
    } catch (err) {
      setErrors({ name: String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="Atras" />
          </IonButtons>
          <IonTitle>Modificar mazo</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={saving || loading} onClick={handleSave}>
              {saving ? <IonSpinner name="crescent" /> : "Guardar"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        style={
          {
            "--padding-top": "24px",
            "--padding-bottom": "calc(24px + var(--ion-safe-area-bottom))",
            "--padding-start": "calc(16px + var(--ion-safe-area-left))",
            "--padding-end": "calc(16px + var(--ion-safe-area-right))",
          } as React.CSSProperties
        }
      >
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
            <IonSpinner name="crescent" />
          </div>
        )}

        {errors.load && (
          <IonText color="danger">
            <p>{errors.load}</p>
          </IonText>
        )}

        {!loading && !errors.load && (
          <>
            {/* Hidden file input for gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Image picker area */}
            <div
              onClick={() => setShowImageSheet(true)}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--ion-color-light)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginBottom: 28,
                position: "relative",
              }}
            >
              {image ? (
                <>
                  <img
                    src={image}
                    alt="Imagen del mazo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IonIcon
                      icon={cameraOutline}
                      style={{ fontSize: 36, color: "white" }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <IonIcon
                    icon={imageOutline}
                    style={{ fontSize: 48, color: "var(--ion-color-medium)", marginBottom: 8 }}
                  />
                  <IonText color="medium">
                    <p style={{ margin: 0, fontSize: "1rem" }}>Agregar imagen</p>
                  </IonText>
                </>
              )}
            </div>

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <IonInput
                label="Nombre"
                labelPlacement="floating"
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? "")}
                clearInput
                style={{ fontSize: "1.1rem" }}
              />
              {errors.name && (
                <IonText color="danger">
                  <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{errors.name}</p>
                </IonText>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <IonTextarea
                label="Descripcion"
                labelPlacement="floating"
                value={description}
                onIonInput={(e) => setDescription(e.detail.value ?? "")}
                autoGrow
                rows={3}
                style={{ fontSize: "1.1rem" }}
              />
            </div>

            {/* Image source action sheet */}
            <IonActionSheet
              isOpen={showImageSheet}
              onDidDismiss={() => setShowImageSheet(false)}
              header="Imagen del mazo"
              buttons={[
                {
                  text: "Camara",
                  icon: cameraOutline,
                  handler: () => { openCamera(); },
                },
                {
                  text: "Galeria",
                  icon: imageOutline,
                  handler: () => { fileInputRef.current?.click(); },
                },
                ...(image
                  ? [
                      {
                        text: "Eliminar imagen",
                        icon: trashOutline,
                        role: "destructive" as const,
                        handler: () => { setImage(null); },
                      },
                    ]
                  : []),
                {
                  text: "Cancelar",
                  role: "cancel" as const,
                },
              ]}
            />
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ModifyDeck;
