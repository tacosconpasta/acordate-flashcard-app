import { useRef, useState } from "react";
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
import { useHistory } from "react-router-dom";
import { getUsers, insertDeck } from "../lib/Database";

const AddDeck: React.FC = () => {
  const history = useHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);

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
    if (!validate()) return;
    setSaving(true);
    try {
      const users = await getUsers();
      const userId = users[0]?.id;
      if (userId === undefined) throw new Error("No hay usuario registrado.");

      await insertDeck({
        name: name.trim(),
        description: description.trim(),
        image: image ?? null,
        last_practiced: null,
        user_id: userId,
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
          <IonTitle>Nuevo mazo</IonTitle>
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
            "--padding-top": "24px",
            "--padding-bottom": "calc(24px + var(--ion-safe-area-bottom))",
            "--padding-start": "calc(16px + var(--ion-safe-area-left))",
            "--padding-end": "calc(16px + var(--ion-safe-area-right))",
          } as React.CSSProperties
        }
      >
        {/* Hidden file input for gallery — triggered synchronously to keep user-gesture context */}
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
                style={{
                  fontSize: 48,
                  color: "var(--ion-color-medium)",
                  marginBottom: 8,
                }}
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
            placeholder="Ej. Vocabulario en inglés"
            value={name}
            onIonInput={(e) => setName(e.detail.value ?? "")}
            clearInput
            style={{ fontSize: "1.1rem" }}
          />
          {errors.name && (
            <IonText color="danger">
              <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
                {errors.name}
              </p>
            </IonText>
          )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <IonTextarea
            label="Descripcion"
            labelPlacement="floating"
            placeholder="Ej. Palabras comunes del dia a dia"
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
              // openCamera() is async but the camera overlay UI (PWA elements / native) handles its own gesture
              handler: () => {
                openCamera();
              },
            },
            {
              text: "Galeria",
              icon: imageOutline,
              // Must be synchronous — clicking a file input requires an active user gesture
              handler: () => {
                fileInputRef.current?.click();
              },
            },
            ...(image
              ? [
                  {
                    text: "Eliminar imagen",
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

export default AddDeck;
