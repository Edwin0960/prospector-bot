import { useState, useRef } from "react";

const CATEGORIES = [
  "Clínicas y salud", "Estéticas y belleza", "Restaurantes y comida",
  "Inmobiliarias", "Tiendas y retail", "Academias y cursos",
  "Abogados y servicios legales", "Contadores y finanzas",
  "Gimnasios y fitness", "Hoteles y turismo", "Mecánicas y autos",
  "Ferreterías y construcción", "Farmacias", "Veterinarias",
  "Agencias de marketing", "Consultorías"
];

const EMAIL_TEMPLATE = `Asunto: Propuesta para aumentar sus ventas sin costo fijo

Estimado equipo de [NEGOCIO],

Mi nombre es [TU NOMBRE] y me dirijo a ustedes porque noté que tienen un negocio activo con potencial de crecimiento en ventas y atención al cliente.

Me especializo en gestión de clientes y cierre de ventas por WhatsApp y teléfono. Trabajo completamente por comisión — si no genero resultados, no cobro nada.

Lo que ofrezco:
• Atención inmediata a consultas entrantes
• Seguimiento activo a clientes potenciales
• Cierre de ventas profesional
• Reportes semanales de resultados

Me gustaría coordinar una videollamada de 15 minutos para contarles cómo funciona sin compromiso.

¿Tienen disponibilidad esta semana?

Quedo atento a su respuesta.

Saludos,
[TU NOMBRE]
[TU TELÉFONO]`;

export default function ProspectorBot() {
  const [city, setCity] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [tab, setTab] = useState("search");
  const [copied, setCopied] = useState(null);
  const [myName, setMyName] = useState("");
  const [myPhone, setMyPhone] = useState("");
  const [myEmail, setMyEmail] = useState("");
  const [emailTemplate, setEmailTemplate] = useState(EMAIL_TEMPLATE);
  const [sendingTo, setSendingTo] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [sent, setSent] = useState([]);
  const [generatingEmail, setGeneratingEmail] = useState(null);

  const toggleCat = (cat) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const selectAll = () => setSelectedCats(CATEGORIES);
  const clearAll = () => setSelectedCats([]);

  const searchBusinesses = async () => {
    if (!city.trim()) return alert("Por favor ingresa una ciudad.");
    if (selectedCats.length === 0) return alert("Selecciona al menos una categoría.");

    setLoading(true);
    setResults([]);
    setSent([]);

    const cats = selectedCats.join(", ");
    const prompt = `Eres un asistente de prospección de negocios. Genera una lista de 15 tipos de negocios REALES y específicos que típicamente existen en ${city} para las categorías: ${cats}.

Para cada negocio genera datos REALISTAS y VARIADOS. Responde SOLO con JSON válido, sin texto adicional, sin backticks:

{
  "negocios": [
    {
      "nombre": "Nombre del negocio",
      "categoria": "categoría",
      "descripcion": "qué hace este negocio en una línea",
      "potencial": "alto|medio|bajo",
      "razon": "por qué necesita ayuda con ventas/atención",
      "emailEstimado": "info@nombreejemplo.com",
      "buscarEn": "término exacto para buscar en Google Maps",
      "estimadoIngreso": "$X - $Y por mes en comisiones"
    }
  ]
}`;

    try {
      setProgress("Analizando mercado con IA...");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await res.json();
      const text = data.content.map(i => i.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed.negocios || []);
      setProgress("");
      setTab("results");
    } catch (e) {
      setProgress("Error al procesar. Intenta de nuevo.");
    }

    setLoading(false);
  };

  const generatePersonalizedEmail = async (biz) => {
    setGeneratingEmail(biz.nombre);
    const name = myName || "[TU NOMBRE]";
    const phone = myPhone || "[TU TELÉFONO]";

    const prompt = `Eres un experto en ventas B2B. Redacta un email profesional, cálido y persuasivo en español para contactar a "${biz.nombre}", un negocio de "${biz.categoria}" en ${city}.

Contexto: ${biz.razon}
Remitente: ${name}, especialista en ventas y atención al cliente
Objetivo: conseguir una reunión/videollamada de 15 minutos

El email debe:
- Ser breve (máximo 150 palabras)
- Mencionar algo específico del negocio
- Proponer una videollamada o llamada concreta
- Terminar con firma de ${name}, teléfono: ${phone}
- Tener asunto llamativo en la primera línea como "ASUNTO: ..."

Responde SOLO con el texto del email, sin explicaciones.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const emailText = data.content.map(i => i.text || "").join("").trim();
      setGeneratingEmail(null);
      return emailText;
    } catch (e) {
      setGeneratingEmail(null);
      return emailTemplate.replace(/\[NEGOCIO\]/g, biz.nombre).replace(/\[TU NOMBRE\]/g, name).replace(/\[TU TELÉFONO\]/g, phone);
    }
  };

  const handleSendEmail = async (biz, idx) => {
    const emailText = await generatePersonalizedEmail(biz);
    const lines = emailText.split("\n");
    const subjectLine = lines.find(l => l.toUpperCase().includes("ASUNTO:")) || "";
    const subject = subjectLine.replace(/ASUNTO:\s*/i, "").trim() || `Propuesta para ${biz.nombre} — sin costo fijo`;
    const body = lines.filter(l => !l.toUpperCase().includes("ASUNTO:")).join("\n").trim();

    setConfirmModal({ biz, idx, subject, body, email: biz.emailEstimado });
  };

  const confirmAndSend = (modal) => {
    const { subject, body, email } = modal;
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    setSent(prev => [...prev, modal.idx]);
    setConfirmModal(null);
  };

  const sendTopProspects = async () => {
    const top = results.filter(b => b.potencial === "alto");
    if (top.length === 0) return alert("No hay negocios con potencial ALTO en la lista actual.");
    setConfirmModal({ bulk: true, count: top.length, top });
  };

  const confirmBulkSend = async (top) => {
    setConfirmModal(null);
    for (let i = 0; i < top.length; i++) {
      const biz = top[i];
      const idx = results.indexOf(biz);
      setSendingTo(biz.nombre);
      const emailText = await generatePersonalizedEmail(biz);
      const lines = emailText.split("\n");
      const subjectLine = lines.find(l => l.toUpperCase().includes("ASUNTO:")) || "";
      const subject = subjectLine.replace(/ASUNTO:\s*/i, "").trim() || `Propuesta para ${biz.nombre}`;
      const body = lines.filter(l => !l.toUpperCase().includes("ASUNTO:")).join("\n").trim();
      const mailto = `mailto:${biz.emailEstimado}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto, "_blank");
      setSent(prev => [...prev, idx]);
      await new Promise(r => setTimeout(r, 1200));
    }
    setSendingTo(null);
  };

  const openGoogleMaps = (term) => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(`${term} en ${city}`)}`, "_blank");
  };

  const openInstagram = (nombre) => {
    window.open(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(nombre)}`, "_blank");
  };

  const potColor = (p) => ({ alto: "#00ff88", medio: "#ffd166", bajo: "#ff6b6b" })[p] || "#aaa";

  const topCount = results.filter(b => b.potencial === "alto").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Mono','Courier New',monospace", color: "#e0e0e0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .btn-primary { background: #00ff88; color: #0a0a0f; border: none; padding: 13px 26px; font-family: 'Syne',sans-serif; font-weight: 800; font-size: 14px; cursor: pointer; letter-spacing: 1px; transition: all 0.2s; }
        .btn-primary:hover { background: #00cc6a; transform: translateY(-1px); }
        .btn-primary:disabled { background: #1a3329; color: #2a5a3a; cursor: not-allowed; transform: none; }
        .btn-yellow { background: #ffd166; color: #0a0a0f; border: none; padding: 13px 26px; font-family: 'Syne',sans-serif; font-weight: 800; font-size: 13px; cursor: pointer; letter-spacing: 1px; transition: all 0.2s; }
        .btn-yellow:hover { background: #e6bc5a; transform: translateY(-1px); }
        .btn-ghost { background: transparent; color: #666; border: 1px solid #222; padding: 8px 16px; font-family: 'DM Mono',monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #00ff88; color: #00ff88; }
        .cat-chip { padding: 6px 14px; border: 1px solid #222; background: #111; color: #666; font-size: 11px; cursor: pointer; transition: all 0.15s; font-family: 'DM Mono',monospace; }
        .cat-chip.active { border-color: #00ff88; color: #00ff88; background: #001a0d; }
        .tab { padding: 10px 20px; background: transparent; border: none; color: #444; font-family: 'DM Mono',monospace; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab.active { color: #00ff88; border-bottom-color: #00ff88; }
        .card { background: #0f0f17; border: 1px solid #1a1a2e; padding: 20px; transition: border-color 0.2s; }
        .card:hover { border-color: #2a2a4a; }
        input, textarea { background: #111; border: 1px solid #222; color: #e0e0e0; font-family: 'DM Mono',monospace; font-size: 13px; padding: 12px; width: 100%; outline: none; transition: border-color 0.2s; }
        input:focus, textarea:focus { border-color: #00ff88; }
        input::placeholder { color: #333; }
        .pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .action-btn { background: #111; border: 1px solid #1a1a2e; color: #555; padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: 'DM Mono',monospace; transition: all 0.2s; white-space: nowrap; }
        .action-btn:hover { border-color: #444; color: #aaa; }
        .action-btn.email { border-color: #1a3a6a; color: #4488cc; }
        .action-btn.email:hover { border-color: #4488cc; color: #88bbff; background: #0a1a2a; }
        .action-btn.sent { border-color: #1a4a2e; color: #00ff88; background: #001a0d; cursor: default; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal { background: #0f0f17; border: 1px solid #2a2a4a; padding: 28px; max-width: 560px; width: 100%; }
      `}</style>

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div className="overlay">
          <div className="modal">
            {confirmModal.bulk ? (
              <>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "#ffd166", marginBottom: 12 }}>
                  ¿Enviar a los {confirmModal.count} mejores?
                </div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8, marginBottom: 20 }}>
                  El bot va a generar un email personalizado con IA para cada negocio de potencial ALTO y abrirá Gmail listo para enviar uno por uno.<br /><br />
                  <span style={{ color: "#ffd166" }}>⚠ Tú decides si enviar cada uno — Gmail se abre pero no envía solo.</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn-yellow" onClick={() => confirmBulkSend(confirmModal.top)}>
                    → SÍ, PROCEDER
                  </button>
                  <button className="btn-ghost" onClick={() => setConfirmModal(null)}>cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#00ff88", marginBottom: 4 }}>
                  Email para {confirmModal.biz.nombre}
                </div>
                <div style={{ fontSize: 11, color: "#333", marginBottom: 16 }}>Revisa antes de enviar — se abrirá tu Gmail</div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#444", marginBottom: 4, letterSpacing: 2 }}>PARA</div>
                  <div style={{ fontSize: 12, color: "#4488cc", background: "#0a1a2a", padding: "8px 12px", border: "1px solid #1a3a6a" }}>
                    {confirmModal.email}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#444", marginBottom: 4, letterSpacing: 2 }}>ASUNTO</div>
                  <div style={{ fontSize: 12, color: "#e0e0e0", background: "#111", padding: "8px 12px", border: "1px solid #222" }}>
                    {confirmModal.subject}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#444", marginBottom: 4, letterSpacing: 2 }}>MENSAJE</div>
                  <div style={{ fontSize: 11, color: "#666", background: "#111", padding: "12px", border: "1px solid #222", whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", lineHeight: 1.7 }}>
                    {confirmModal.body}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn-primary" onClick={() => confirmAndSend(confirmModal)}>
                    → ABRIR EN GMAIL
                  </button>
                  <button className="btn-ghost" onClick={() => setConfirmModal(null)}>cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "#00ff88", letterSpacing: "-0.5px" }}>
            PROSPECTOR<span style={{ color: "#222" }}>.AI</span>
          </div>
          <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>búsqueda + email automático con IA</div>
        </div>
        <div style={{ fontSize: 10, color: "#1a4a2e", textAlign: "right" }}>
          <div style={{ color: "#00ff88" }}>● EN LÍNEA</div>
          <div>Claude Sonnet</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "0 28px", display: "flex", gap: 4 }}>
        <button className={`tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>/ búsqueda</button>
        <button className={`tab ${tab === "results" ? "active" : ""}`} onClick={() => setTab("results")}>
          / prospectos {results.length > 0 && `(${results.length})`}
        </button>
        <button className={`tab ${tab === "config" ? "active" : ""}`} onClick={() => setTab("config")}>/ mis datos</button>
      </div>

      <div style={{ padding: "28px", maxWidth: 880, margin: "0 auto" }}>

        {/* SEARCH TAB */}
        {tab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div className="card" style={{ borderLeft: "2px solid #ffd166", padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "#ffd166", marginBottom: 4, letterSpacing: 2 }}>ANTES DE BUSCAR</div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Configura tus datos en <span style={{ color: "#ffd166", cursor: "pointer" }} onClick={() => setTab("config")}>"mis datos"</span> para que los emails tengan tu nombre y teléfono.
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 8, letterSpacing: 2 }}>CIUDAD OBJETIVO</div>
              <input placeholder="Ej: Caracas, Bogotá, Madrid, Miami..." value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === "Enter" && searchBusinesses()} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#444", letterSpacing: 2 }}>CATEGORÍAS</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" onClick={selectAll}>todo</button>
                  <button className="btn-ghost" onClick={clearAll}>limpiar</button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} className={`cat-chip ${selectedCats.includes(cat) ? "active" : ""}`} onClick={() => toggleCat(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#333" }}>{selectedCats.length} categorías seleccionadas</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button className="btn-primary" onClick={searchBusinesses} disabled={loading}>
                {loading ? "ANALIZANDO..." : "→ BUSCAR PROSPECTOS"}
              </button>
              {progress && <div className="pulse" style={{ fontSize: 12, color: "#00ff88" }}>{progress}</div>}
            </div>

            <div className="card" style={{ borderLeft: "2px solid #00ff88" }}>
              <div style={{ fontSize: 11, color: "#00ff88", marginBottom: 8, letterSpacing: 2 }}>FLUJO COMPLETO</div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.9 }}>
                01 → Buscas negocios por ciudad y categoría<br />
                02 → La IA identifica cuáles tienen más potencial<br />
                03 → Con un clic genera un email personalizado para cada uno<br />
                04 → <span style={{ color: "#ffd166" }}>El bot te muestra el email y te pregunta si enviarlo</span><br />
                05 → Se abre tu Gmail listo — tú das el último clic<br />
                06 → Cuando respondan, entras tú a cerrar la reunión
              </div>
            </div>
          </div>
        )}

        {/* RESULTS TAB */}
        {tab === "results" && (
          <div>
            {results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#333" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
                <div style={{ fontSize: 13 }}>Haz una búsqueda primero</div>
                <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setTab("search")}>ir a búsqueda →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: "#444", letterSpacing: 2 }}>
                    {results.length} NEGOCIOS · {topCount} POTENCIAL ALTO · {sent.length} EMAILS ENVIADOS
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {topCount > 0 && (
                      <button className="btn-yellow" onClick={sendTopProspects} disabled={!!sendingTo}>
                        {sendingTo ? `enviando a ${sendingTo}...` : `→ ENVIAR A LOS ${topCount} MEJORES`}
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => { setTab("search"); setResults([]); setSent([]); }}>nueva búsqueda</button>
                  </div>
                </div>

                {results.map((biz, i) => (
                  <div key={i} className="card slide-in" style={{ animationDelay: `${i * 0.04}s`, opacity: sent.includes(i) ? 0.7 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#e0e0e0" }}>{biz.nombre}</div>
                        <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>{biz.categoria} · {city}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {sent.includes(i) && <div style={{ fontSize: 10, color: "#00ff88" }}>✓ enviado</div>}
                        <div style={{ fontSize: 10, color: potColor(biz.potencial), border: `1px solid ${potColor(biz.potencial)}`, padding: "3px 10px", letterSpacing: 1 }}>
                          {(biz.potencial || "").toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{biz.descripcion}</div>

                    <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", padding: "8px 12px", fontSize: 12, color: "#444", marginBottom: 12 }}>
                      <span style={{ color: "#00ff88" }}>↳</span> {biz.razon}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#00ff88" }}>{biz.estimadoIngreso}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="action-btn" onClick={() => openGoogleMaps(biz.buscarEn)}>Maps →</button>
                        <button className="action-btn" onClick={() => openInstagram(biz.nombre)}>Instagram →</button>
                        <button
                          className={`action-btn email ${sent.includes(i) ? "sent" : ""}`}
                          onClick={() => !sent.includes(i) && handleSendEmail(biz, i)}
                          disabled={generatingEmail === biz.nombre}
                        >
                          {sent.includes(i) ? "✓ enviado" : generatingEmail === biz.nombre ? "generando..." : "✉ enviar email"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFIG TAB */}
        {tab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, marginBottom: 4 }}>TUS DATOS — aparecen en cada email</div>

            <div>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 6 }}>TU NOMBRE</div>
              <input placeholder="Ej: Carlos Rodríguez" value={myName} onChange={e => setMyName(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 6 }}>TU TELÉFONO / WHATSAPP</div>
              <input placeholder="Ej: +58 412 000 0000" value={myPhone} onChange={e => setMyPhone(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 6 }}>TU EMAIL (para referencia)</div>
              <input placeholder="Ej: carlos@gmail.com" value={myEmail} onChange={e => setMyEmail(e.target.value)} />
            </div>

            <div className="card" style={{ borderLeft: "2px solid #4488cc" }}>
              <div style={{ fontSize: 11, color: "#4488cc", marginBottom: 8, letterSpacing: 2 }}>CÓMO FUNCIONA EL EMAIL</div>
              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.9 }}>
                ● Das clic en "enviar email" en cualquier negocio<br />
                ● La IA genera un email personalizado para ese negocio<br />
                ● <span style={{ color: "#ffd166" }}>Te muestra el email completo y te pregunta si proceder</span><br />
                ● Si dices sí, se abre tu Gmail con todo listo<br />
                ● Tú das el último clic en Enviar — siempre tienes control<br />
                ● También puedes enviar a todos los de potencial ALTO de un golpe
              </div>
            </div>

            <button className="btn-primary" onClick={() => setTab("search")}>
              → GUARDAR Y BUSCAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
