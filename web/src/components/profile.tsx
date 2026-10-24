"use client";
import { useRef, useState } from "react";
import {
  Download,
  HardDrive,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  accuracy,
  emptyProgress,
  progressSchema,
  totalAttempts,
  type Progress,
} from "../lib/learning-engine";
import { Modal, PageHeading } from "./ui";
export function Profile({
  progress,
  update,
}: {
  progress: Progress;
  update: (value: Progress | ((p: Progress) => Progress)) => void;
}) {
  const [name, setName] = useState(progress.name),
    [goal, setGoal] = useState(progress.goal),
    [message, setMessage] = useState(""),
    [reset, setReset] = useState(false),
    [pending, setPending] = useState<Progress | null>(null);
  const input = useRef<HTMLInputElement>(null);
  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          { app: "evolua", exportedAt: new Date().toISOString(), progress },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolua-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup exportado. Guarde o arquivo em um local seguro.");
  }
  async function importBackup(file: File) {
    try {
      if (file.size > 2 * 1024 * 1024)
        throw Error("Arquivo muito grande. O limite é 2 MB.");
      const raw = JSON.parse(await file.text());
      if (raw.app !== "evolua")
        throw Error("Este arquivo não é um backup da Evolua.");
      setPending(progressSchema.parse(raw.progress));
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes("Arquivo")
          ? error.message
          : "Não foi possível importar. Escolha um backup válido exportado pela Evolua.",
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="DO SEU JEITO"
        title="A sua jornada tem o seu ritmo."
        description="Personalize sua experiência e cuide do seu progresso."
      />
      <div className="profile-grid">
        <section className="panel profile-settings">
          <span className="round-icon lime">
            <UserRound />
          </span>
          <h2>Seu perfil de aprendizado</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update((p) => ({ ...p, name: name.trim(), goal }));
              setMessage("Seu perfil foi atualizado. Boa jornada!");
            }}
          >
            <label className="field-label">
              Como podemos chamar você?
              <input
                maxLength={40}
                placeholder="Seu primeiro nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field-label">
              Meta diária de atividades
              <select
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              >
                {[5, 10, 15, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} atividades por dia
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small-text">
              Cards e quizzes contam para sua meta. Você pode mudar quando
              quiser.
            </p>
            <button className="button button-primary" type="submit">
              <Save size={16} /> Salvar preferências
            </button>
          </form>
        </section>
        <section className="panel">
          <span className="round-icon lavender">
            <HardDrive />
          </span>
          <h2>Seu conhecimento vai com você</h2>
          <p className="muted">
            Esta versão salva seu progresso e seus rascunhos neste navegador.
            Para levar sua jornada a outro dispositivo, exporte um backup e
            importe por lá.
          </p>
          <div className="profile-stats">
            <span>
              <strong>{totalAttempts(progress)}</strong> atividades
            </span>
            <span>
              <strong>{accuracy(progress)}%</strong> de acertos
            </span>
            <span>
              <strong>{progress.xp}</strong> XP
            </span>
          </div>
          <div className="backup-actions">
            <button className="button button-primary" onClick={exportBackup}>
              <Download size={16} /> Exportar backup
            </button>
            <button
              className="button button-outline"
              onClick={() => input.current?.click()}
            >
              <Upload size={16} /> Importar backup
            </button>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              aria-label="Selecionar backup"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importBackup(file);
              }}
            />
          </div>
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <p>
              Sem cadastro nesta versão. Seus dados de estudo ficam no seu
              navegador. Limpar os dados do site remove o progresso local.
            </p>
          </div>
        </section>
      </div>
      {message && (
        <p className="inline-message" role="status">
          {message}
        </p>
      )}
      <section className="panel reset-panel">
        <div>
          <h3>Um novo começo</h3>
          <p className="muted">
            Apague o progresso e os rascunhos deste navegador.
          </p>
        </div>
        <button className="button button-danger" onClick={() => setReset(true)}>
          <Trash2 size={16} /> Reiniciar progresso
        </button>
      </section>
      <p className="bottom-note">
        Evolua · Aprendizado em movimento · Versão web 1.0
      </p>
      {reset && (
        <Modal title="Recomeçar sua jornada?" onClose={() => setReset(false)}>
          <p>
            O progresso, XP e rascunhos deste navegador serão apagados. Exporte
            um backup antes se quiser recuperá-los depois.
          </p>
          <div className="modal-actions">
            <button
              className="button button-outline"
              onClick={() => setReset(false)}
            >
              Cancelar
            </button>
            <button
              className="button button-danger"
              onClick={() => {
                update(emptyProgress());
                setName("");
                setGoal(15);
                setReset(false);
                setMessage(
                  "Progresso reiniciado. Sua próxima jornada começa agora.",
                );
              }}
            >
              Apagar progresso local
            </button>
          </div>
        </Modal>
      )}
      {pending && (
        <Modal title="Restaurar este backup?" onClose={() => setPending(null)}>
          <p>
            O backup contém {pending.xp} XP e {totalAttempts(pending)}{" "}
            atividades. Ele substituirá o progresso e os rascunhos deste
            navegador.
          </p>
          <div className="modal-actions">
            <button
              className="button button-outline"
              onClick={() => setPending(null)}
            >
              Cancelar
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                update(pending);
                setName(pending.name);
                setGoal(pending.goal);
                setPending(null);
                setMessage("Backup restaurado. Sua jornada continua!");
              }}
            >
              Restaurar backup
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
