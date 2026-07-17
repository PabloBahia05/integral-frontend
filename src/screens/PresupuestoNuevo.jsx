import { useState, useEffect, useRef } from "react";
import PresupuestoMamparas from "./PresupuestoMamparas";
import TiposVanitory from "./TiposVanitory";
import ArmarVanitory from "./ArmarVanitory";
import BreakdownFormulasVanitory from "./BreakdownFormulasVanitory";
import PresupuestoVanitory from "./PresupuestoVanitory";
import PresupuestoWallPanel from "./PresupuestoWallPanel";
import TiposDespensero from "./TiposDespensero";
import PresupuestoDespensero from "./PresupuestoDespensero";
import TabMampara from "./TabMampara";
import TabEspeciales from "./TabEspeciales";
import TabCocina from "./TabCocina";

const WALLPANEL_IMG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAPEhUQDw8PDxUVFRUVFRUPEBUPEA8QFRYYFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDQ0OGA8NFS4dFRktKysrKys3KystLSsrKystKy0tKysrNysrLSstLS0tKysrKysrKysrKysrKysrKysrK//AABEIAL4BCQMBIgACEQEDEQH/xAAaAAACAwEBAAAAAAAAAAAAAAAEBQEDBgIA/8QAPxAAAQICBQoDBAkEAwEAAAAAAQACAwURM3KxsgQGEiEiIzEyccJzgsETYZGzNEFDUWKBg5LRFFKh4UJj8KL/xAAaAQEBAQEBAQEAAAAAAAAAAAAAAQUDAgQG/8QAGhEBAQEAAwEAAAAAAAAAAAAAAAExAgQyEf/aAAwDAQACEQMRAD8AXZvN3Z69oTqGxKs3G7s9RhCdMC+l87oBJ5YN+63FvKdgJLLa91uLeUDpQpK9Qgz07r2WB8xP3BIZ0N+ywPmLQO4oOUtnvIzxBgemaWz0bDPEGB6C7IBumdPVXkKqX1TOnqiKEAU1G5iWHXFCyEbDrfYxFzWpiWHXFDSLkdb7GID6F4hdUKCgSyAc3Rncm1CVyDg7ozuTZRVbln5eN8+1FxNWhes/L659qLiapVh/IxvXWRjatDkg2Dacs/I611kY2rRZIN2bTrgsrt+60ev4Mcm9PVDT0bvzs9UVk/p6lCzw7vzNXLhj3y0Lm+NcXrDwome1Y8Rvqh83+MXqzCiZ6d0LbbirC6Fzb+1tswBFTrlFpvchs3ftbTPlhEzkbIttucpC6Gze4xbTcAVs9q22xhcq83xW2m4FZPhsC2MLlIXQ+brdmL4zrgu56Nllv0KjNvli+M64KyejUy36FONLoTN1u5d4kW8pnoH7j8EBm4Ny7xYt5TGkpMS6webY3Z69oTloSjNsbs9RhCctC3WU6SSW17rcW8p2kktr3W4t5QOl4KV4IM/Oxv2WB8xP3JFO69lgfMT5yDlLZ7ys8QYHpoEtno2GeIMD0F8vG6ZZ9VeVTLxumWfVXoA5qNzEsOuKFkQ3brfYxGTUbmJYdcULIqt1vsYoD1BXSgqhNIODujO5NkqkHB3Rncmq8vSt6QS+ufai4mrQOCQy4b59qLjapVh9I611kY2rRZMd2bTvRZ6SVrrPe1P8mOwbTrll9v3Wh1/Jlk/En3C8oee1XmaiclHpeUNPKvzNXLhke+Whc3+MW0zCiJ8N3523FD5v/bWmYSr57Vi224pxLqjNw1tpnywiZzyi23CUNm4dcW0z5aKnHKLYo/a5SF0LIjW2m4FZPuQWxc5VyH7S0MAVs+qx4no9IXVObh2YvjOuCsn/AAh2/QqrNzlieM+4K2f8GWjcpFuqs3G7o+LEvcmNA+8oHNuqcP8AsiYijPzKTEusPm4N2bXaE4CU5uVZtdoTdbrJeSWW17rcW8p0k0sr3W4t5RTpeUryqEE7r2WB8xPnDWkU6r2WB8wp+7ig5oS2ejYZ4gwPTNLZ7ys8QYHoL5fVMs+qvVEvG6ZZ9UQgEmo3MSw64oWRVbrfYxFzWpiWHXIWRVbrZwMUUwXJXS5KBPIODujO5NUqkHB3RncmqiuHJDLa59qLjanzkhltc+1FxtUqn0krXWe5q0GTclP4nf5oWek1abPcxaLJRuz1deFldv20ev5M8m1D4XlCTur8zbkZBGo9PVBzyrFtvquXHHq6Gzf4xR74eFXz7VD87LnKiQ8YtpmFXz87vzsuKRbofNwa4ttmBFzobDbYuP8AKFzb4xbbcCKnQ2W2vjqKQuhpAK2038jorufVYti5y4zf4xbTMK7n1W22MLlIXQ+bfLF8V9zVbnBwZavCqzc4RPGdcFZP+Vlq4KQuozaO6PiRcSP1+5A5s1R8SLiTLV/4pMLrCZuVZtdoTZKs3Ks2u0Jqt5kJSWWV7rUW8p0k0sr3Wot5RYdKV4KUCCdV7LA+YnzuKQzqvZYb8wp+7ighLZ7yM8QYHpkl095GeJ2OVF+QVTLKvVEvqmWVeoBJrUxLDrkNIat1s4GIqa1MSw65CyGrdbOBiBgoIXSgoEub/B3RncmpSvN/g7ozuTRRXDkiltc+1FxtT1yRS2ufai42qVTyTjfGycbFosnq/M70Wdk9abJxsWhyUbHmdcFk9z3Wj1/MNIPD8vVBz2rFtvqUbAF3qgZ5VC2y4rlxx7uhpAdcXqzCURPzuxaZ6ofN/jF6swFE5wVYtN7lYXVGbf2tpmAImc06DbfoUNm3xi224ETODsNtC4qQuhpBxi2mYV1PqttsYXLmQ/a9WYV1nAd2PEFxUhdD5t8sXxXXBW5wcrLRwlU5smlsXxTcFdnBystdpSLdRm3VHxIuJNPMEszZG6d4sQf/AEE00FIXWEzdqza7QmqVZu1ZtDC1NVvshKSSyvdai3lO0klle61FvKB4pChSECCdV7LDfmFP3JDOfpDLDfmFP3IIS2e8jPE7HpkEtn3IzxOx6C+X1TLIRCol9UyyFegEmtTEsOuQ0hq3WzgYiprUxLDrkLIat1s4GIGKgqVCKS5vcHdGdyapXm9wd0Z3JovIrekUtrn2ouNqfPSGW1z7UXG1R6PJPWmz3sWhySr8zvRZ+T1ps97Fosl5KPxOWV3PdaHX8mmT/f7igp4N15m+qNyc8Oh9EHPRuxab6rlx8x7uhM3xtRfcYeH/AGiZ/V+dvqh83uMbrDwomf1f6je5It0Nm4dcW0z5aJnI2BbGEoXN3jFP4mfLRc5OwLYwqQuhJBxi9W4VM/qxbFxUyHjF6twqZ+N2LbcJSF0Pm1RoxfF7Wqye8sOn6ndpXGbXCKP+3tarJ8dllsD/AOSoXUZs1R8WJiCZ+1SzNirPjRMQTWn3BIXWEzdqza7Wpqleb1WbXa1NFvshKSSyvdai3lOwksrr3Wot5QO1IUKQgQzn6Qyw35hT93FIJx9IZYb8wp+5FeCWz7kZ4nY9MQl095WeJ2ORBGQVTLIV6ol9UyyFegEmtTEsOuQ0hq3WzhYiZrUxLDrkNIat3iHCxRTBQVKgqhNm9wd0Z3JqUqzf4O6M9U2K8qqekMtrn2ouNqfPSGXVz+sXG1RT2TVp6d7VoslOwT+I3LOyatPTvatFktX5jcsrue60Ov5Nck+r/wB9yDnx3Qtt9UXkx+rqhJ9rheYeq5cfL3dCSDjG6w8JRM9q/wBRvqh5ANcXqy4oifcnnb6qRboTNs1tqH8tGzobAti538IXNv7S1D+WipwNgW23OSF0LIuaL1bhK6n1WLQucuJHxi9W3Fdz6rFttzlIXQ+bnCL4va1dz/lh2u1y4zcp0Y3i9rVZP+Vh/EMBSF1zmvqhOH/dExJjoFL82ap3jRL03o96kW6web1WbXa1NAlebtUbXa1NVvsd4JJK691qLiKdpJK691qLiRYeKVClEIZx9IZYZ8wp+5Z+cfSGWGfMKflFeCXT3lZ4nY5MQl095WW+xyAiX1TLIRCoyCqZZCvQCTWpiWHXIWQ1bvEOFiKmtTEsOuQshq3eIcLEDAqCuiuSgT5vcHdGeqalKs3uV3RlxTUqKqekMtrn2ouNqfPSGW1z+sXG1SqeyYb02e5q0WT8htOuWek1Y6z3tWhgHYNo+qyu37rQ6/kyyb0Qs8buvMEVkwuQ0+qvM1ceOOl0JIOMX9O4oqe1fmZ6oTN/mijw7ii57VeZtxSF0Nm5xi2oeBFzg7Ap/ubc5B5ucYtpmAoudDYFttxUmF0HIzrjeXCVbPqsWx3/AMKuSjajdWYSrJ9yecXv/lJhdD5t/beL2BWz3lbaGEqnNnhG8XtarZ4NhloYXKRbrnNiqd4sS8JvqSjNmrd4sS8J1QpC6wObtUbXa1NEqzdqja7Wpqv0DIeSSVV7rUXEnaSSmvd1i4kDxeXl5AhnH0hlhnzCn54pBOPpLLLPmFPyg8EunvKy32OTEJbPeVlvscgJl9UyyEQqMgqmWQr0Ak1qYlhyGkNW7xDhYiJtUxLDkPIat3iHC1AwXJXSgopNm8Nl3Rlzk1cleb3K7oy5yaFeRU9IJbXP6xsbVoHpBLK59qLjalU+kx3ps9zVocnqzaJvWdlFb+XexaPJas9Ssrt+60Ov5Msn+v8AO5DT+p8zb/8AaKybgT7jcENPqnzsv/0uPHHS6BkA2ovVnqip7Vfm31Q2b524vWHcUVPKr823qRboXNw64vWHgRc65RabcUJm2NqNah4Ai51yAfiFxSF0LIRtRurLipnw3YtN7v5USE7cXqy4hdzyqFplxSF0Nm1wjeKMDVbOhsMtDCVTmyNUbxRhCIn1W212n+FC6qzaG7f40S8JtT7ylWbPJE8Z96cafuSF1gc3ao2u1qbJRm7Vm0bmpuFvsh5JJTXO6xcadpLKK53WLjQO15eXkCCb/SWWYfzCtAVn5v8ASWWYfzSn6CUtnvKy32OTFLp7yst9jkBOQVTLIV6oyCqZZCvQCTapiWHIaQ1ZtnC1ETapiWCqJDVnxHYWopgoKlcuUCjN7ld0Zc5NCleb3K7oy4poVFVPSGWVz+sXG1P3rPyyuf1i4wgfyetPTvYtDklV5is7J609BjatFktWbTlldz20Ov5NMl4fH47Konw3Xmb6ojJOHxuahp7VdXN9Vx4+XS6BkA2ov6VzkVPDu/OENIOaL0h3ORE7G7Ntt6kW6Gzb5o1plyMnA2G2hd/tB5vHXF6w8KNnHILQuSF0HIOaJ1h+q7nw3Ytw7lXIzQ6L7gz1V09qvNDSYXQmbZrvEbgCIno3bbX19HIbNwa43iNwBFT0bAtC4qQuqs2eSJ4zv8n/AGmmifvKV5tcsTxim2kkLrAZvHdeY3BN2pNm8d15jcE3aVvsh2kknrndYuNPEkk9a79TGpVO15eUKoQzb6SyzD+YU/Wfmv0llmH8xy0BRXktn3Ky32OTJLZ9yst9jkQTkNUywLleqMhqmWG3K5FCzapiWCh5DVm27C1XzY7mJYKokNWbbsLVAxXLl0uHIFOb3K7yXFNClWb/ACu6MucmpUVU9IJXXP6xcYT96QSuuf1i4wgfyWtdZGNi0GSVZtOWdlB3v5d7FosjO7daN6yu36aHX8muS8PjcFRPqrzNRGRcPjcELPjuvM29cePl0ugZDzxf0u5FTyqNP97b0Jm/rfG/S7kZO6o2m3qRboXN4a436eEo6cVfnZ6IDN/mi/p4UfOTu/OxIXQMi5o3RtzlfPjuvzbcqJENuN0bc5Xz4bo2m/5UhdCZt80a23AETOqsWvQ/yhM2+Me2zAEZOqsHVzC4/wAJC6GzaOxE8U+hTfTSfNs7MTxjcExoKQusHm+d35jcE4YUikLx7Lj/AMj6JxDf71vMkSCk0mrXfqY01Dgk8kePau1j7TGiHq8vUqKUCGafSmWYXzHJ+Vnpo4f1TNY4QvmOT+lFdpZPuVls4HJiHJZPnDRZbOByAzIaplhtyuQ+Qu3UOw25XU+9ALNqmJZKokNWbbsLVdN3D2MTX/xKHkLh7M6/+brmqBmuXr1K5cVVKs3uV3Rlzk0KU5vOGi7WODLimpKg4ekErrn9YuMJ69wWfljh7Z+scYuNqitBKa38u5q0ORDYNs/BZ6TuHtTr+ruatDkh2HWjeVldv0+/r+TXI+A/Mf4CHn1V+bcQV+RnV8bmqifHdU/ibjC48cdLpfm/WRR4fcjp4N0bTL0BIKyLr+qHicjp3VeZnokW6EkOp0b9P40I+c8nnal+b7tqN0hnV0KYTnk8wvISF0FIqyL0Z3oie1fmbeUNITvInRnciZ3R7M2mKQugM3OaPbZgCMnNX5m3FBZtEUx9dO3DPxYEZODu/O31SF0Jm27ZieKcLUx0ylWbTtmJ4t7Wprp9PihW3GSwxwhs/aFP9ND/ALGftCtXlsM5V/Ts/sZ+0KBksMcIbB5R/CuXkFf9Oz+xn7Qo/p2f2M/aFavIKTksPj7Nn7Qp/p2f2M/aFavIKv6dn9jP2hQ7JoZ+zYfKFcoKBQ+aZI17Wbuh2mNLRGgHscxpbTR97+PDUVGVzfI4VBOi6lpePZw9PYDS+k0DVSAaF2ZFBJeSYh09OnaAADywuAAFA5G6+PGmlcszeginaimkaNBeKPZ6LmaHDloeffw1oOjMsj+t0IamkhzKDtaIAoo47bNXHaH3qDM8jaQNigiIdIQ92BC0dMl1FAo0hrXocgghxftkl0N5J0aXPhlhDiQ2nX7NtIpo46ta86QQTpUuiHSMQnaA1RA0OGoahsMNI10tppNJpCI81yRopHs3mlooDQC3SfoUupGzQdLUaOU/cinR8nAYT7Oh/Jsjb+ukauFH1oQ5uQDpBxiOEQgxQ5wLY7g4uBeKPeRQKBRqo1CggylhDBpxd2C1pLgT7NwAcwkjWDotpp16uKCgTTIRRQ+Br4UNFJ5aNVHA6bKPv0hRxCNhOgPDS32TtNum2gNpezVtAfWNY+IQUDN6A0h1MRxGgAXPpOjDdDexvDgDBZ/mmkmlMMkyRkJrWMHINFpOtwB46/yHwQK3zaAA4nJoo0CNKmEzZY7WHnXw/DzfhXo8ygMERzMldFEN2i4w2QhSdXLpubpazo6vrBVjZE0UD2+Uaohi6/ZGmJ97qWbXuppooFFFAVsCR5PDNMOGGDSY7RZqYTDBDNn7hTSB94B+pANlE3yaG4t9nSfaNhAgQobXvIcdlz3NBA0HDjxFApXJzgyUCMdB25JDgGNLnEF4OiAeO7eaDQaBTRQQUQ6QZPQ5rGmE14DXthENa9g0hoEUagdM8KCqn5r5K4OD2F+k1zBpGn2LH6RcIZ+rW92s0nXxo1J8F0SaQW+03UTdxGwjRC4udo0OH4NrmNA1fXqpZGE08WtP5BL4soa72g9tGAiFpIb7OhuhRohtLOFAHGngmTRq+/3niVPkHAgMHBjR0aF4wWni1p/IKxeT5D6rbAYODWjo0KTCaeLW/ALteT5D6rEBg4NaOjQvGC08WtPUBWLyfIfVbYDBwY0dGheMFp/4t+AVi8nyCpuTsHBjR0aFPsWf2t/aFYvJ8h9f/9k=";

const API = "https://integral-backend-production.up.railway.app";

const LOCALIDADES = [
  "Bahía Blanca",
  "Punta Alta",
  "Monte Hermoso",
  "Coronel Rosales",
  "Otra",
];

const formatFechaLarga = (fecha) => {
  const d = fecha ? new Date(fecha + "T12:00:00") : new Date();
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ── Componente reutilizable: formulario de medidas para Especiales ──────────
function EspecialesMedidasForm({
  tipo,
  icono,
  titulo,
  medidas,
  setMedidas,
  materialSearch,
  setMaterialSearch,
  materialFocus,
  setMaterialFocus,
  materialesFiltrados,
  guiasSearch,
  setGuiasSearch,
  guiasFocus,
  setGuiasFocus,
  guiasFiltradas,
  onVolver,
  onContinuar,
}) {
  const inputStyle = {
    width: "100%",
    fontFamily: "'Space Mono',monospace",
    fontSize: 13,
    border: "1px solid #b8cfe0",
    padding: "8px 12px",
    borderRadius: 3,
    boxSizing: "border-box",
    background: "#fff",
    color: "#0a3a5c",
    outline: "none",
  };
  const labelStyle = {
    display: "block",
    fontSize: 10,
    color: "#6699bb",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 5,
    fontFamily: "'Space Mono',monospace",
  };
  const fieldWrap = {
    flex: "1 1 120px",
    display: "flex",
    flexDirection: "column",
  };

  const canContinue =
    medidas.ancho &&
    medidas.alto &&
    medidas.profundidad &&
    medidas.materialPlaca;

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #b8cfe0",
    borderTop: "none",
    zIndex: 60,
    boxShadow: "0 6px 18px #0002",
    maxHeight: 220,
    overflowY: "auto",
    borderRadius: "0 0 3px 3px",
  };
  const dropItemStyle = {
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'Space Mono',monospace",
    borderBottom: "1px solid #eef2f6",
    color: "#0a3a5c",
  };

  return (
    <div style={{ fontFamily: "'Space Mono',monospace" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#e8f0f7",
          border: "1px solid #c8dae8",
          borderRadius: 3,
          padding: "12px 18px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icono}</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#0a3a5c",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {titulo}
          </span>
          <span style={{ fontSize: 11, color: "#6699bb", marginLeft: 4 }}>
            — Medidas y materiales
          </span>
        </div>
        <button
          onClick={onVolver}
          style={{
            padding: "5px 14px",
            background: "#fff",
            border: "1px solid #b8cfe0",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            cursor: "pointer",
            color: "#0a3a5c",
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Formulario */}
      <div
        style={{
          background: "#f5f9fc",
          border: "1px solid #c8dae8",
          borderRadius: 4,
          padding: "22px 24px",
        }}
      >
        {/* Fila: medidas numéricas */}
        <div
          style={{
            marginBottom: 6,
            fontSize: 10,
            color: "#8aabcc",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Medidas (cm)
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          {[
            { key: "ancho", label: "Ancho", placeholder: "ej: 60" },
            { key: "alto", label: "Alto", placeholder: "ej: 90" },
            { key: "profundidad", label: "Profundidad", placeholder: "ej: 45" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={fieldWrap}>
              <label style={labelStyle}>{label} *</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={medidas[key]}
                onChange={(e) =>
                  setMedidas((m) => ({ ...m, [key]: e.target.value }))
                }
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Línea divisoria */}
        <div style={{ borderTop: "1px solid #d0e4f0", marginBottom: 20 }} />

        {/* Material Placa */}
        <div
          style={{
            marginBottom: 6,
            fontSize: 10,
            color: "#8aabcc",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Materiales
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 0,
          }}
        >
          {/* Material Placa */}
          <div
            style={{ ...fieldWrap, flex: "2 1 220px", position: "relative" }}
          >
            <label style={labelStyle}>Material Placa *</label>
            <input
              value={materialSearch}
              onChange={(e) => {
                setMaterialSearch(e.target.value);
                setMedidas((m) => ({ ...m, materialPlaca: e.target.value }));
              }}
              onFocus={() => setMaterialFocus(true)}
              onBlur={() => setTimeout(() => setMaterialFocus(false), 160)}
              placeholder="Tipear para filtrar..."
              style={{
                ...inputStyle,
                borderColor: medidas.materialPlaca ? "#7aaac8" : "#b8cfe0",
              }}
            />
            {materialFocus && materialesFiltrados.length > 0 && (
              <div style={dropdownStyle}>
                {materialesFiltrados.map((m, i) => {
                  const nombre =
                    m.nombreart ??
                    m.NOMBREART ??
                    m.articulo ??
                    m.ARTICULO ??
                    "";
                  const codigo = m.articulo ?? m.ARTICULO ?? "";
                  return (
                    <div
                      key={i}
                      style={dropItemStyle}
                      onMouseDown={() => {
                        const val = nombre || codigo;
                        setMaterialSearch(val);
                        setMedidas((md) => ({ ...md, materialPlaca: val }));
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#ddeefa")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 700 }}>{nombre}</span>
                      {codigo && nombre !== codigo && (
                        <span
                          style={{
                            color: "#8aabcc",
                            marginLeft: 8,
                            fontSize: 10,
                          }}
                        >
                          {codigo}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {materialFocus &&
              materialesFiltrados.length === 0 &&
              materialSearch.length > 0 && (
                <div
                  style={{
                    ...dropdownStyle,
                    padding: "10px 14px",
                    color: "#8aabcc",
                    fontSize: 11,
                  }}
                >
                  Sin resultados — se usará el texto ingresado
                </div>
              )}
          </div>

          {/* Guías */}
          <div
            style={{ ...fieldWrap, flex: "2 1 220px", position: "relative" }}
          >
            <label style={labelStyle}>Guías</label>
            <input
              value={guiasSearch}
              onChange={(e) => {
                setGuiasSearch(e.target.value);
                setMedidas((m) => ({ ...m, guias: e.target.value }));
              }}
              onFocus={() => setGuiasFocus(true)}
              onBlur={() => setTimeout(() => setGuiasFocus(false), 160)}
              placeholder="Tipear para filtrar..."
              style={inputStyle}
            />
            {guiasFocus && guiasFiltradas.length > 0 && (
              <div style={dropdownStyle}>
                {guiasFiltradas.map((g, i) => {
                  const nombre =
                    g.nombreart ??
                    g.NOMBREART ??
                    g.articulo ??
                    g.ARTICULO ??
                    "";
                  const codigo = g.articulo ?? g.ARTICULO ?? "";
                  return (
                    <div
                      key={i}
                      style={dropItemStyle}
                      onMouseDown={() => {
                        const val = nombre || codigo;
                        setGuiasSearch(val);
                        setMedidas((md) => ({ ...md, guias: val }));
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "#ddeefa")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "#fff")
                      }
                    >
                      <span style={{ fontWeight: 700 }}>{nombre}</span>
                      {codigo && nombre !== codigo && (
                        <span
                          style={{
                            color: "#8aabcc",
                            marginLeft: 8,
                            fontSize: 10,
                          }}
                        >
                          {codigo}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {guiasFocus &&
              guiasFiltradas.length === 0 &&
              guiasSearch.length > 0 && (
                <div
                  style={{
                    ...dropdownStyle,
                    padding: "10px 14px",
                    color: "#8aabcc",
                    fontSize: 11,
                  }}
                >
                  Sin resultados — se usará el texto ingresado
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Resumen + botón continuar */}
      {(medidas.ancho ||
        medidas.alto ||
        medidas.profundidad ||
        medidas.materialPlaca ||
        medidas.guias) && (
        <div
          style={{
            marginTop: 16,
            background: "#fff",
            border: "1px solid #c8dae8",
            borderRadius: 3,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#6699bb",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Resumen:
          </span>
          {medidas.ancho && (
            <span style={{ fontSize: 12, color: "#0a3a5c" }}>
              📐 <b>{medidas.ancho}</b> × <b>{medidas.alto || "—"}</b> ×{" "}
              <b>{medidas.profundidad || "—"}</b> cm
            </span>
          )}
          {medidas.materialPlaca && (
            <span style={{ fontSize: 12, color: "#0a3a5c" }}>
              🪵 <b>{medidas.materialPlaca}</b>
            </span>
          )}
          {medidas.guias && (
            <span style={{ fontSize: 12, color: "#0a3a5c" }}>
              🔩 <b>{medidas.guias}</b>
            </span>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={onVolver}
          style={{
            padding: "8px 20px",
            background: "#fff",
            border: "1px solid #b8cfe0",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 12,
            cursor: "pointer",
            color: "#0a3a5c",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={onContinuar}
          disabled={!canContinue}
          style={{
            padding: "8px 28px",
            background: canContinue ? "#0a3a5c" : "#c8dae8",
            color: "#fff",
            border: "none",
            borderRadius: 2,
            fontFamily: "'Space Mono',monospace",
            fontSize: 13,
            fontWeight: 700,
            cursor: canContinue ? "pointer" : "default",
            letterSpacing: "0.04em",
          }}
        >
          {tipo === "vanitory" ? "Continuar →" : "Confirmar medidas ✓"}
        </button>
      </div>
      {!canContinue && (
        <div
          style={{
            marginTop: 8,
            textAlign: "right",
            fontSize: 10,
            color: "#c0392b",
            fontFamily: "'Space Mono',monospace",
          }}
        >
          * Ancho, Alto, Profundidad y Material Placa son obligatorios
        </div>
      )}
    </div>
  );
}

export default function PresupuestoNuevo({
  onVolver,
  onGuardado,
  onVerTabla,
  presupuestoInicial = null,
  tiposVanitory = [],
  tiposVanitoryRUD = {},
  tiposDespensero = [],
  tiposDespenseroRUD = {},
  token,
}) {
  const listaPendienteRef = useRef(null);

  // ── Helper autenticado: agrega el JWT a todas las requests ──
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  const [numero, setNumero] = useState("Nuevo");
  const [numeroPres, setNumeroPres] = useState(null); // número real asignado tras primer guardado
  const [presmv, setPresmv] = useState(null); // id de presupuesto_mampara vinculado
  const [mamparaAEditar, setMamparaAEditar] = useState(null); // datos para editar mampara existente
  const [revision, setRevision] = useState(1);
  const [cliente, setCliente] = useState("");
  const [codcliente, setCodcliente] = useState(null);
  const cargandoPresupuestoRef = useRef(false); // true mientras cargarPresupuesto está en curso
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [lineasBD, setLineasBD] = useState([]); // valores distintos de columna 'linea' en articulos
  const [telefonoSearch, setTelefonoSearch] = useState("");
  const [telefonosSugeridos, setTelefonosSugeridos] = useState([]);
  const [telefono1, setTelefono1] = useState("");
  const [telefono2, setTelefono2] = useState("");
  const [wapp, setWapp] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [domicilioFiscal, setDomicilioFiscal] = useState("");
  // Resolución automática de cliente: busca por nombre, luego por teléfono,
  // y si no existe lo da de alta solo, sin que el usuario elija de una lista.
  const [resolviendoCliente, setResolviendoCliente] = useState(false);
  const [clienteAutoResuelto, setClienteAutoResuelto] = useState(null); // "existente" | "nuevo" | null
  const [localidad, setLocalidad] = useState("Bahía Blanca");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [leyenda, setLeyenda] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [error, setError] = useState("");

  // Lista de precios
  const [listasDB, setListasDB] = useState([]); // listas traídas de BD
  const [listaPrecio, setListaPrecio] = useState("");

  // Porcentaje de la lista activa (0 si no hay porcentaje)
  const listaActiva = listasDB.find((l) => l.lista === listaPrecio);
  const listaPorcentaje =
    parseFloat(listaActiva?.porcentaje ?? listaActiva?.PORCENTAJE ?? 0) || 0;

  // Aplica el porcentaje de la lista al precio base
  const aplicarPorcentaje = (precioBase) => {
    if (!precioBase && precioBase !== 0) return "";
    const base = parseFloat(precioBase) || 0;
    if (listaPorcentaje === 0) return String(base);
    return String(Math.round(base * (1 + listaPorcentaje / 100) * 100) / 100);
  };
  const [mostrarCosto, setMostrarCosto] = useState(false);
  const [incluirPrecio, setIncluirPrecio] = useState(false);
  const [incluirSubtotalItem, setIncluirSubtotalItem] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [incluirTotal, setIncluirTotal] = useState(true);
  const [color, setColor] = useState("");
  const [incluirTextoColoc, setIncluirTextoColoc] = useState(false);
  const [agregarIVA, setAgregarIVA] = useState(true);

  // Líneas (3 slots)
  const [lineas, setLineas] = useState([
    { linea: "[Sin líneas]", col2: "", col3: "" },
    { linea: "[Sin líneas]", col2: "", col3: "" },
    { linea: "[Sin líneas]", col2: "", col3: "" },
  ]);

  // Pestañas
  const [tab, setTab] = useState("encabezado"); // "encabezado" | "cocina" | "placard" | "mampara" | "especiales" | "presupuesto"

  // Sub-navegación Especiales
  const [especialesVista, setEspecialesVista] = useState("selector"); // "selector" | "vanitory" | "escritorio" | "despensero"
  const [vanitoryVista, setVanitoryVista] = useState("tipos"); // "tipos" | "medidas" | "armar" | "breakdown"
  const [despenseroModelo, setDespenseroModelo] = useState(null);
  const [despenseroVista, setDespenseroVista] = useState("tipos"); // "tipos" | "presupuesto"
  const [vanitoryModelo, setVanitoryModelo] = useState(null);

  // ── Formulario de medidas para Especiales ────────────────
  const MEDIDAS_INIT = {
    ancho: "",
    alto: "",
    profundidad: "",
    materialPlaca: "",
    guias: "",
  };
  const [especialesMedidas, setEspecialesMedidas] = useState(MEDIDAS_INIT);
  const [especialesTipo, setEspecialesTipo] = useState(null); // "vanitory"|"escritorio"|"despensero"
  // Búsqueda material placa
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialFocus, setMaterialFocus] = useState(false);
  const [materialesDB, setMaterialesDB] = useState([]);
  // Búsqueda guías
  const [guiasSearch, setGuiasSearch] = useState("");
  const [guiasFocus, setGuiasFocus] = useState(false);
  const [guiasDB, setGuiasDB] = useState([]);

  // Cargar materiales/guias desde BD al montar
  useEffect(() => {
    authFetch(`${API}/articulos/por-familia?familia=placas`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterialesDB(data);
      })
      .catch(() => {});
    authFetch(`${API}/articulos/por-familia?familia=guias`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGuiasDB(data);
      })
      .catch(() => {});
  }, []);

  const materialesFiltrados = materialesDB
    .filter(
      (m) =>
        (m.articulo ?? m.ARTICULO ?? "")
          .toLowerCase()
          .includes(materialSearch.toLowerCase()) ||
        (m.nombreart ?? m.NOMBREART ?? "")
          .toLowerCase()
          .includes(materialSearch.toLowerCase()),
    )
    .slice(0, 12);

  const guiasFiltradas = guiasDB
    .filter(
      (g) =>
        (g.articulo ?? g.ARTICULO ?? "")
          .toLowerCase()
          .includes(guiasSearch.toLowerCase()) ||
        (g.nombreart ?? g.NOMBREART ?? "")
          .toLowerCase()
          .includes(guiasSearch.toLowerCase()),
    )
    .slice(0, 12);

  const irAMedidas = (tipo, modelo = null) => {
    setEspecialesTipo(tipo);
    setEspecialesMedidas(MEDIDAS_INIT);
    setMaterialSearch("");
    setGuiasSearch("");
    if (tipo === "vanitory") {
      setVanitoryModelo(modelo);
      setVanitoryVista("medidas");
    } else {
      setEspecialesVista(tipo); // va a escritorio o despensero directamente
    }
  };

  // ── Cocina ───────────────────────────────────────────────
  // familiaActiva: null | "bajomesadas" | "alacenas"
  const [cocinaFamilia, setCocinaFamilia] = useState(null);
  // líneas cargadas por familia: { bajomesadas: [...], alacenas: [...] }
  const [cocinaItems, setCocinaItems] = useState({
    bajomesadas: [],
    alacenas: [],
  });

  // ── Placard ──────────────────────────────────────────────
  const [placardFamilia, setPlacardFamilia] = useState(null);
  const [placardItems, setPlacardItems] = useState({
    placard: [],
    frente: [],
    auxiliares: [],
    accesorios: [],
  });

  // ── Tabla resumen presupuesto (solapa Presupuesto) ───────
  // Cada ítem: { id, seccion, descripcion, cantidad, precio, subtotal }
  const [presupuestoItems, setPresupuestoItems] = useState([]);

  // ── Popover de ajuste inline por fila ───────────────────
  // { tipo: "cocina"|"placard", familia, idx, campo: "precio"|linea_idx, anchorRect }
  const [precioPopover, setPrecioPopover] = useState(null);
  const [popoverModo, setPopoverModo] = useState("valor"); // "valor" | "porcentaje"
  const [popoverInput, setPopoverInput] = useState("");

  const abrirPrecioPopover = (tipo, familia, idx, campo, precioActual, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();

    // Recuperar el porcentaje ya guardado en esa columna (si existe)
    const items =
      tipo === "cocina"
        ? (cocinaItems[familia] ?? [])
        : (placardItems[familia] ?? []);
    const fila = items[idx];
    const CAMPOS_POR_IDX = [
      { v: "valor1", p: "porcentaje1" },
      { v: "valor2", p: "porcentaje2" },
      { v: "valor3", p: "porcentaje3" },
    ];
    let porcentajeActual = null;
    if (fila) {
      if (campo === "precio") {
        porcentajeActual = fila.porcentaje1 ?? null;
      } else if (CAMPOS_POR_IDX[campo]) {
        porcentajeActual = fila[CAMPOS_POR_IDX[campo].p] ?? null;
      }
    }

    setPrecioPopover({
      tipo,
      familia,
      idx,
      campo,
      precioActual,
      porcentajeActual,
      rect,
    });
    setPopoverModo("valor");
    setPopoverInput(String(precioActual ?? ""));
  };

  const cerrarPopover = () => {
    setPrecioPopover(null);
    setPopoverInput("");
  };

  const confirmarPopover = () => {
    if (!precioPopover) return;
    const val = parseFloat(popoverInput);
    if (isNaN(val)) {
      cerrarPopover();
      return;
    }
    const { tipo, familia, idx, campo, precioActual } = precioPopover;

    const calcNuevo = (base) => {
      const b = parseFloat(base) || 0;
      if (popoverModo === "valor") return val < 0 ? Math.max(0, b + val) : val;
      return Math.round(b * (1 + val / 100) * 100) / 100;
    };

    // Devuelve { valor: "N", porcentaje: N|null } para guardar en valorN/porcentajeN
    const calcPersist = (base) => {
      const nuevo = calcNuevo(base);
      return {
        valor: nuevo,
        porcentaje: popoverModo === "porcentaje" ? val : null,
      };
    };

    // Mapeo índice de columna (0,1,2) → campos valor/porcentaje en la fila
    const CAMPOS_POR_IDX = [
      { v: "valor1", p: "porcentaje1" },
      { v: "valor2", p: "porcentaje2" },
      { v: "valor3", p: "porcentaje3" },
    ];

    const actualizarItems = (prev) =>
      prev.map((fila, i) => {
        if (i !== idx) return fila;

        if (campo === "precio") {
          // Sin líneas activas: precio único — guardamos en valor1/porcentaje1
          const { valor, porcentaje } = calcPersist(fila.precio);
          return {
            ...fila,
            precio: String(valor),
            valor1: valor,
            porcentaje1: porcentaje,
          };
        }

        // campo es índice de línea (número)
        const lineaIdx = campo; // 0-based
        const precios = (fila.precios ?? []).map((p, li) => {
          if (li !== lineaIdx) return p;
          const { valor } = calcPersist(p.precio);
          return { ...p, precio: String(valor) };
        });
        const nuevoPrecio = precios[0]?.precio ?? fila.precio;

        // Guardar valor y porcentaje en el slot correspondiente (valorN/porcentajeN)
        const slot = CAMPOS_POR_IDX[lineaIdx];
        const { valor, porcentaje } = calcPersist(
          (fila.precios?.[lineaIdx]?.precio ?? fila.precio) || 0,
        );

        const extra = slot ? { [slot.v]: valor, [slot.p]: porcentaje } : {};

        return { ...fila, precios, precio: String(nuevoPrecio), ...extra };
      });

    if (tipo === "cocina") {
      setCocinaItems((prev) => ({
        ...prev,
        [familia]: actualizarItems(prev[familia] ?? []),
      }));
    } else {
      setPlacardItems((prev) => ({
        ...prev,
        [familia]: actualizarItems(prev[familia] ?? []),
      }));
    }
    cerrarPopover();
  };

  // ── Popover de edición inline de ítem en Presupuesto ───
  const [presItemPopover, setPresItemPopover] = useState(null); // { id, lineaIdx (null = sin líneas), precioActual, rect }
  const [presItemModo, setPresItemModo] = useState("valor"); // "valor" | "porcentaje"
  const [presItemInput, setPresItemInput] = useState("");

  const abrirPresItemPopover = (id, lineaIdx, precioActual, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPresItemPopover({ id, lineaIdx, precioActual, rect });
    setPresItemModo("valor");
    setPresItemInput(String(precioActual ?? ""));
  };

  const cerrarPresItemPopover = () => {
    setPresItemPopover(null);
    setPresItemInput("");
  };

  const confirmarPresItemPopover = () => {
    if (!presItemPopover) return;
    const val = parseFloat(presItemInput);
    if (isNaN(val)) {
      cerrarPresItemPopover();
      return;
    }
    const { id, lineaIdx } = presItemPopover;

    const calcNuevo = (base) => {
      const b = parseFloat(base) || 0;
      if (presItemModo === "valor") return val < 0 ? Math.max(0, b + val) : val;
      return Math.round(b * (1 + val / 100) * 100) / 100;
    };

    // Si el ítem viene de Cocina o Placard, escribimos el cambio en el
    // estado fuente (cocinaItems/placardItems) para que el % quede
    // asociado al ítem real: sobrevive a "Actualizar"/cambio de lista y
    // se puede mostrar combinado con el % de la lista (badge "21+10").
    const match = id.match(/^(cocina|placard)-(.+)-(\d+)$/);
    if (match) {
      const [, seccionTipo, familia, idxStr] = match;
      const idx = parseInt(idxStr, 10);
      const PCT_POR_IDX = ["porcentaje1", "porcentaje2", "porcentaje3"];

      const actualizar = (prev) => {
        const filas = prev[familia] ?? [];
        const fila = filas[idx];
        if (!fila) return prev;

        let nuevaFila;
        if (lineaIdx == null) {
          const nuevo = calcNuevo(fila.precio);
          nuevaFila = {
            ...fila,
            precio: String(nuevo),
            porcentaje1:
              presItemModo === "porcentaje" ? val : fila.porcentaje1,
          };
        } else {
          const precios = (fila.precios ?? []).map((p, li) => {
            if (li !== lineaIdx) return p;
            return { ...p, precio: String(calcNuevo(p.precio)) };
          });
          const nuevoPrecio = precios[0]?.precio ?? fila.precio;
          const slot = PCT_POR_IDX[lineaIdx];
          const extra = slot
            ? {
                [slot]: presItemModo === "porcentaje" ? val : fila[slot],
              }
            : {};
          nuevaFila = {
            ...fila,
            precios,
            precio: String(nuevoPrecio),
            ...extra,
          };
        }
        return {
          ...prev,
          [familia]: filas.map((f, i) => (i === idx ? nuevaFila : f)),
        };
      };

      if (seccionTipo === "cocina") {
        setCocinaItems(actualizar);
      } else {
        setPlacardItems(actualizar);
      }
      cerrarPresItemPopover();
      return;
    }

    // Ítems "otros" (mampara/vanitory/especiales): no tienen estado fuente
    // aparte, se editan directo en presupuestoItems.
    setPresupuestoItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (lineaIdx == null) {
          const nuevo = calcNuevo(it.precio);
          return {
            ...it,
            precio: nuevo,
            subtotal: nuevo * (parseFloat(it.cantidad) || 1),
          };
        }
        const precios = (it.precios ?? []).map((p, li) => {
          if (li !== lineaIdx) return p;
          return { ...p, precio: String(calcNuevo(p.precio)) };
        });
        const nuevoPrecio = parseFloat(precios[0]?.precio ?? it.precio) || 0;
        return {
          ...it,
          precios,
          precio: nuevoPrecio,
          subtotal: nuevoPrecio * (parseFloat(it.cantidad) || 1),
        };
      }),
    );
    cerrarPresItemPopover();
  };

  // ── Ajuste de precios ────────────────────────────────────
  const [ajusteModo, setAjusteModo] = useState("porcentaje"); // "porcentaje" | "monto"
  const [ajusteValor, setAjusteValor] = useState("");
  const [ajusteScope, setAjusteScope] = useState("todos"); // "todos" | id de item
  const [preciosOriginales, setPreciosOriginales] = useState({}); // { [id]: { precio, precios } }
  const [ajusteAplicado, setAjusteAplicado] = useState(false);

  // NOTA: presupuestoItems para las filas de cocina/placard se REGENERA
  // automáticamente a partir de cocinaItems/placardItems (ver el useEffect
  // "Sincronizar cocina y placard con la tabla de presupuesto" más abajo).
  // Por eso el ajuste NO puede aplicarse solo sobre presupuestoItems: en
  // cuanto cocinaItems/placardItems cambian por cualquier otro motivo, ese
  // efecto pisa el precio ajustado con el precio "limpio" de origen. Hay
  // que tocar la fuente de verdad (cocinaItems/placardItems) para los ids
  // que empiezan con "cocina-"/"placard-", y presupuestoItems directo para
  // el resto (mampara/especiales, que no tienen fuente propia).
  const calcularAjuste = (base, val) => {
    const b = parseFloat(base) || 0;
    const n =
      ajusteModo === "porcentaje"
        ? Math.round(b * (1 + val / 100) * 100) / 100
        : Math.round((b + val) * 100) / 100;
    return n < 0 ? 0 : n;
  };

  const aplicarAjuste = () => {
    const val = parseFloat(ajusteValor);
    if (!val || isNaN(val)) return;

    // Guardar originales antes del primer ajuste (precio + precios[] por línea)
    if (!ajusteAplicado) {
      const orig = {};
      presupuestoItems.forEach((it) => {
        orig[it.id] = {
          precio: it.precio,
          precios: (it.precios ?? []).map((p) => ({ ...p })),
        };
      });
      setPreciosOriginales(orig);
    }

    const ajustarFila = (id, f, origenPreciosOriginales) => {
      if (ajusteScope !== "todos" && id !== ajusteScope) return f;
      const origItem = ajusteAplicado
        ? origenPreciosOriginales[id]
        : { precio: f.precio, precios: f.precios };
      const precioBase = parseFloat(origItem?.precio ?? f.precio) || 0;
      const nuevoPrecio = calcularAjuste(precioBase, val);
      const nuevosPrecios = (origItem?.precios ?? f.precios ?? []).map((p) => ({
        ...p,
        precio: String(calcularAjuste(p.precio, val)),
      }));
      return {
        ...f,
        precio: nuevoPrecio,
        precios: nuevosPrecios.length ? nuevosPrecios : f.precios,
      };
    };

    // preciosOriginales puede no estar actualizado en este mismo tick si es
    // el primer ajuste (setPreciosOriginales es async): armamos el mapa a
    // usar de forma síncrona para no depender del timing de React.
    const origenActual = ajusteAplicado
      ? preciosOriginales
      : Object.fromEntries(
          presupuestoItems.map((it) => [
            it.id,
            { precio: it.precio, precios: (it.precios ?? []).map((p) => ({ ...p })) },
          ]),
        );

    setCocinaItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map((f, i) =>
          ajustarFila(`cocina-${familia}-${i}`, f, origenActual),
        );
      }
      return next;
    });
    setPlacardItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map((f, i) =>
          ajustarFila(`placard-${familia}-${i}`, f, origenActual),
        );
      }
      return next;
    });
    setPresupuestoItems((prev) =>
      prev.map((it) => {
        if (it.id.startsWith("cocina-") || it.id.startsWith("placard-")) {
          // Estos se actualizan solos vía el efecto de sincronización
          // cuando cocinaItems/placardItems cambien arriba.
          return it;
        }
        const ajustado = ajustarFila(it.id, it, origenActual);
        if (ajustado === it) return it;
        const nuevaCantidad = parseFloat(it.cantidad) || 1;
        return { ...ajustado, subtotal: ajustado.precio * nuevaCantidad };
      }),
    );

    setAjusteAplicado(true);
  };

  const revertirAjuste = () => {
    if (!ajusteAplicado) return;

    const revertirFila = (id, f) => {
      const orig = preciosOriginales[id];
      if (orig == null) return f;
      const p = parseFloat(orig.precio) || 0;
      return {
        ...f,
        precio: p,
        precios: orig.precios?.length ? orig.precios : f.precios,
      };
    };

    setCocinaItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map((f, i) =>
          revertirFila(`cocina-${familia}-${i}`, f),
        );
      }
      return next;
    });
    setPlacardItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map((f, i) =>
          revertirFila(`placard-${familia}-${i}`, f),
        );
      }
      return next;
    });
    setPresupuestoItems((prev) =>
      prev.map((it) => {
        if (it.id.startsWith("cocina-") || it.id.startsWith("placard-")) return it;
        const orig = preciosOriginales[it.id];
        if (orig == null) return it;
        const p = parseFloat(orig.precio) || 0;
        return {
          ...it,
          precio: p,
          precios: orig.precios?.length ? orig.precios : it.precios,
          subtotal: p * (parseFloat(it.cantidad) || 1),
        };
      }),
    );

    setAjusteAplicado(false);
    setAjusteValor("");
    setPreciosOriginales({});
  };

  const agregarAPresupuesto = (item) => {
    setPresupuestoItems((prev) => {
      // Evitar duplicados por id único
      const existe = prev.find((p) => p.id === item.id);
      if (existe) return prev.map((p) => (p.id === item.id ? item : p));
      return [...prev, item];
    });
  };

  const quitarDePresupuesto = (id) =>
    setPresupuestoItems((prev) => prev.filter((p) => p.id !== id));

  // ── Estado compartido para el buscador de artículos ─────
  // productos traídos de la BD (para el autocomplete)
  const [productosDB, setProductosDB] = useState([]);
  // placard edit state
  const [placardEditIdx, setPlacardEditIdx] = useState(null);
  const [placardFila, setPlacardFila] = useState({
    articulo: "",
    nombreart: "",
    cantidad: 1,
    precio: "",
    precios: [],
    precioPlacard: "",
    margen: null,
    valor1: null,
    porcentaje1: null,
    valor2: null,
    porcentaje2: null,
    valor3: null,
    porcentaje3: null,
  });
  const [placardSearch, setPlacardSearch] = useState("");
  const [placardSearchFocus, setPlacardSearchFocus] = useState(false);
  // Artículos del endpoint agrupado (por familia activa)
  const [articulosFamilia, setArticulosFamilia] = useState([]);

  useEffect(() => {
    // Próximo número
    authFetch(`${API}/tabla-presupuestos/proximo-numero`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.proximo != null) setNumero(String(d.proximo).padStart(4, "0"));
      })
      .catch(() => {});
    // Líneas disponibles desde BD (columna linea de articulos)
    authFetch(`${API}/articulos/lineas`)
      .then((r) => r.json())
      .then((data) => setLineasBD(Array.isArray(data) ? data : []))
      .catch(() => {});
    // Listas de precios desde BD
    authFetch(`${API}/lista`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setListasDB(data);
          if (listaPendienteRef.current) {
            setListaPrecio(listaPendienteRef.current);
            listaPendienteRef.current = null;
          } else if (!presupuestoInicial) {
            setListaPrecio(data[0].lista);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Cargar presupuesto existente desde BD ────────────────
  const cargarPresupuesto = async (pres) => {
    if (!pres) return;
    const num = pres.numeropres ?? pres.id;
    cargandoPresupuestoRef.current = true;
    try {
      // 1. Traer items de tabla_presupuestos
      const rev = pres.revision ?? pres.REVISION ?? 0;
      const r = await authFetch(
        `${API}/tabla-presupuestos?numeropres=${num}&revision=${rev}`,
      );
      const items = await r.json();
      if (!Array.isArray(items)) return;

      // 1.b Restaurar ajuste general (%/monto) si se guardó aplicado
      const itemConAjuste = items.find(
        (it) => it.ajuste_valor ?? it.AJUSTE_VALOR,
      );
      if (itemConAjuste) {
        const valGuardado = parseFloat(
          itemConAjuste.ajuste_valor ?? itemConAjuste.AJUSTE_VALOR,
        );
        const modoGuardado =
          itemConAjuste.ajuste_modo ?? itemConAjuste.AJUSTE_MODO ?? "porcentaje";
        setAjusteValor(String(valGuardado));
        setAjusteModo(modoGuardado);
        setAjusteAplicado(true);
        // NOTA: no reconstruimos preciosOriginales acá porque los ids de
        // presupuestoItems para cocina/placard se regeneran en cada carga
        // (no son el id de la fila en BD) y no matchean de forma confiable.
        // Consecuencia: el botón "Revertir" no va a funcionar después de
        // reabrir un presupuesto — solo funciona en la misma sesión en que
        // se aplicó el ajuste. Si hace falta revertir, hay que aplicar un
        // ajuste inverso manual (ej: -2.91% para deshacer un +3%).
        setPreciosOriginales({});
      } else {
        setAjusteValor("");
        setAjusteAplicado(false);
        setPreciosOriginales({});
      }

      // 2. Restaurar encabezado
      setNumeroPres(num);
      setNumero(String(num).padStart(4, "0"));
      setCliente(pres.nombre ?? pres.NOMBRE ?? "");
      setCodcliente(pres.codcliente ?? pres.CODCLIENTE ?? null);
      setFecha((pres.fecha ?? pres.FECHA ?? "").slice(0, 10));
      setRevision(Number(pres.revision ?? pres.REVISION ?? 1));
      const itemConLista = items.find((it) => it.lista ?? it.LISTA);
      const listaGuardada =
        pres.lista ?? pres.LISTA ?? itemConLista?.lista ?? itemConLista?.LISTA ?? null;
      if (listaGuardada) {
        listaPendienteRef.current = listaGuardada;
        setListaPrecio(listaGuardada);
      }

      const itemConLinea =
        items.find((it) => it.linea1 ?? it.LINEA1) ?? items[0];
      const l1 =
        itemConLinea?.linea1 ?? itemConLinea?.LINEA1 ?? pres.linea1 ?? null;
      const l2 =
        itemConLinea?.linea2 ?? itemConLinea?.LINEA2 ?? pres.linea2 ?? null;
      const l3 =
        itemConLinea?.linea3 ?? itemConLinea?.LINEA3 ?? pres.linea3 ?? null;
      setLineas([
        { linea: l1 ?? "[Sin líneas]", col2: "", col3: "" },
        { linea: l2 ?? "[Sin líneas]", col2: "", col3: "" },
        { linea: l3 ?? "[Sin líneas]", col2: "", col3: "" },
      ]);

      const nuevaCocina = { bajomesadas: [], alacenas: [] };
      const nuevoPlacard = {
        placard: [],
        frente: [],
        auxiliares: [],
        accesorios: [],
      };
      const otrosItems = [];

      items.forEach((it) => {
        const tipo = (it.tipo ?? it.TIPO ?? "").toLowerCase();
        const articulo = it.articulo ?? it.ARTICULO ?? "";
        const nombreart = it.nombreart ?? it.NOMBREART ?? "";
        const v1 = parseFloat(it.valor1 ?? it.VALOR1) || null;
        const v2 = parseFloat(it.valor2 ?? it.VALOR2) || null;
        const v3 = parseFloat(it.valor3 ?? it.VALOR3) || null;
        // Costo puro (sin % de lista ni % de ítem) guardado en base1/2/3.
        // Fallback a valorN para presupuestos guardados ANTES de este cambio
        // (no van a ser 100% exactos si tenían % aplicado, pero es lo mejor
        // disponible sin ese dato — "Actualizar" ya no va a duplicar % de
        // acá en adelante).
        const b1raw = parseFloat(it.base1 ?? it.BASE1);
        const b2raw = parseFloat(it.base2 ?? it.BASE2);
        const b3raw = parseFloat(it.base3 ?? it.BASE3);
        const b1 = !isNaN(b1raw) ? b1raw : v1;
        const b2 = !isNaN(b2raw) ? b2raw : v2;
        const b3 = !isNaN(b3raw) ? b3raw : v3;
        const precios = [
          ...(l1 && v1 != null
            ? [{ linea: l1, precioBase: String(b1 ?? v1), precio: String(v1) }]
            : []),
          ...(l2 && v2 != null
            ? [{ linea: l2, precioBase: String(b2 ?? v2), precio: String(v2) }]
            : []),
          ...(l3 && v3 != null
            ? [{ linea: l3, precioBase: String(b3 ?? v3), precio: String(v3) }]
            : []),
        ];
        const fila = {
          articulo,
          nombreart,
          cantidad: parseFloat(it.cantidad ?? it.CANTIDAD) || 1,
          precio: String(v1 ?? 0),
          precioBase: String(b1 ?? v1 ?? 0),
          precios,
          preciosBase: precios.map((p) => ({
            linea: p.linea,
            precioBase: p.precioBase,
          })),
          margen: it.margen ?? null,
          valor1: v1,
          porcentaje1: parseFloat(it.porcentaje1 ?? it.PORCENTAJE1) || null,
          valor2: v2,
          porcentaje2: parseFloat(it.porcentaje2 ?? it.PORCENTAJE2) || null,
          valor3: v3,
          porcentaje3: parseFloat(it.porcentaje3 ?? it.PORCENTAJE3) || null,
        };
        if (tipo.includes("cocina") && tipo.includes("bajomesada"))
          nuevaCocina.bajomesadas.push(fila);
        else if (tipo.includes("cocina") && tipo.includes("alacena"))
          nuevaCocina.alacenas.push(fila);
        else if (tipo.includes("placard") && tipo.includes("frente"))
          nuevoPlacard.frente.push(fila);
        else if (tipo.includes("placard") && tipo.includes("auxiliar"))
          nuevoPlacard.auxiliares.push(fila);
        else if (tipo.includes("placard") && tipo.includes("accesorio"))
          nuevoPlacard.accesorios.push(fila);
        else if (tipo.includes("placard")) nuevoPlacard.placard.push(fila);
        else {
          const precio0 = v1 ?? 0;
          const seccion = it.tipo ?? it.TIPO ?? "Otros";
          // Si es mampara, restaurar presmv desde la BD
          console.log(
            "[cargar] item seccion:",
            seccion,
            "| presmv:",
            it.presmv,
            "| raw:",
            JSON.stringify(it),
          );
          if (seccion.toLowerCase() === "mampara") {
            const pmv = it.presmv ?? it.PRESMV ?? null;
            console.log("[cargar] mampara encontrada, pmv:", pmv);
            if (pmv != null) setPresmv(pmv);
          }
          // Si es vanitory, restaurar presv desde presmv guardado en BD
          const esVanitory = seccion.toLowerCase() === "vanitory";
          const presvRestaurado = esVanitory
            ? (it.presmv ?? it.PRESMV ?? null)
            : null;
          if (esVanitory && presvRestaurado) {
            console.log(
              "[cargar] vanitory encontrado, presv restaurado:",
              presvRestaurado,
            );
          }
          const esMampara = seccion.toLowerCase() === "mampara";
          const presmvRestaurado = esMampara
            ? (it.presmv ?? it.PRESMV ?? null)
            : null;
          otrosItems.push({
            id: `otros-${it.id}`,
            seccion,
            descripcion: articulo,
            nombreart,
            cantidad: parseFloat(it.cantidad ?? it.CANTIDAD) || 1,
            precio: precio0,
            subtotal: precio0 * (parseFloat(it.cantidad ?? it.CANTIDAD) || 1),
            precios,
            margen: it.margen ?? null,
            valor1: v1,
            porcentaje1: parseFloat(it.porcentaje1 ?? it.PORCENTAJE1) || null,
            valor2: v2,
            porcentaje2: parseFloat(it.porcentaje2 ?? it.PORCENTAJE2) || null,
            valor3: v3,
            porcentaje3: parseFloat(it.porcentaje3 ?? it.PORCENTAJE3) || null,
            // Vinculación vanitory
            ...(esVanitory && presvRestaurado
              ? { presv: presvRestaurado }
              : {}),
            // Vinculación mampara
            ...(esMampara && presmvRestaurado
              ? { presmv: presmvRestaurado }
              : {}),
            // Medidas (mampara y vanitory)
            ancho: it.ancho ?? it.ANCHO ?? null,
            alto: it.alto ?? it.ALTO ?? null,
          });
        }
      });

      setCocinaItems(nuevaCocina);
      setPlacardItems(nuevoPlacard);
      // Los otros se fusionarán en el useEffect de sincronización
      if (otrosItems.length > 0) {
        setPresupuestoItems((prev) => {
          const sinOtros = prev.filter(
            (p) => p.id.startsWith("cocina-") || p.id.startsWith("placard-"),
          );
          return [...sinOtros, ...otrosItems];
        });
      }
    } catch (e) {
      console.error("Error cargando presupuesto:", e);
    } finally {
      cargandoPresupuestoRef.current = false;
    }
  };

  // Cargar si viene presupuestoInicial como prop (desde la tabla)
  useEffect(() => {
    if (presupuestoInicial) cargarPresupuesto(presupuestoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presupuestoInicial]);

  // Recargar artículos cuando cambia la familia activa (placard)
  // Nota: cocina maneja su propia familia internamente en TabCocina
  const familiaActivaActual =
    tab === "placard" ? placardFamilia : null;
  useEffect(() => {
    if (!familiaActivaActual) {
      setArticulosFamilia([]);
      return;
    }
    // Mapear nombre interno → nombre en BD
    const familiaMap = {
      bajomesadas: "Bajomesada",
      alacenas: "Alacena",
      placard: "PLACARD",
      frente: "FRENTE DE PLACARD",
      auxiliares: "Auxiliares",
      accesorios: "Accesorios",
    };
    const familiaBD = familiaMap[familiaActivaActual] ?? familiaActivaActual;
    authFetch(
      `${API}/articulos/por-familia?familia=${encodeURIComponent(familiaBD)}`,
    )
      .then((r) => r.json())
      .then((data) => setArticulosFamilia(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [familiaActivaActual]);

  // Recalcula una fila aplicando el porcentaje de la lista activa
  // + el porcentaje extra propio del ítem (si lo tiene), compuestos.
  const recalcFila = (fila) => {
    const PCT_POR_IDX = ["porcentaje1", "porcentaje2", "porcentaje3"];
    const conExtra = (precioConLista, pctExtra) => {
      if (pctExtra == null || pctExtra === "") return precioConLista;
      const p = parseFloat(precioConLista) || 0;
      const extra = parseFloat(pctExtra) || 0;
      return String(Math.round(p * (1 + extra / 100) * 100) / 100);
    };

    if (fila.preciosBase && fila.preciosBase.length > 0) {
      const nuevosPrecios = fila.preciosBase.map((pb, li) => {
        const conLista = aplicarPorcentaje(pb.precioBase);
        const pctExtra = fila[PCT_POR_IDX[li]];
        return {
          linea: pb.linea,
          precioBase: pb.precioBase,
          precio: conExtra(conLista, pctExtra),
        };
      });
      const nuevoPrecio =
        nuevosPrecios[0]?.precio ?? fila.precioBase ?? fila.precio;
      return { ...fila, precios: nuevosPrecios, precio: String(nuevoPrecio) };
    }
    if (fila.precioBase != null && fila.precioBase !== "") {
      const conLista = aplicarPorcentaje(fila.precioBase);
      return { ...fila, precio: conExtra(conLista, fila.porcentaje1) };
    }
    return fila;
  };

  // Actualiza todo el front con los parámetros actuales del encabezado — sin tocar el backend
  const handleActualizar = () => {
    setCocinaItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map(recalcFila);
      }
      return next;
    });
    setPlacardItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map(recalcFila);
      }
      return next;
    });
  };

  // Recalcular precios cuando cambia la lista de precios
  useEffect(() => {
    // No recalcular mientras se está cargando un presupuesto existente:
    // los precios que trae la BD (valor1/2/3) ya incluyen cualquier ajuste
    // manual (panel "AJUSTE DE PRECIOS") aplicado antes de guardar. Si
    // dejamos correr recalcFila acá, lo pisa con precioBase × %lista,
    // perdiendo el ajuste porque este no vive en porcentaje1/2/3.
    if (cargandoPresupuestoRef.current) return;
    setCocinaItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map(recalcFila);
      }
      return next;
    });
    setPlacardItems((prev) => {
      const next = {};
      for (const [familia, filas] of Object.entries(prev)) {
        next[familia] = filas.map(recalcFila);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaPrecio]);

  // Sincronizar cocina y placard con la tabla de presupuesto
  useEffect(() => {
    const toItems = (seccion, itemsObj) =>
      Object.entries(itemsObj).flatMap(([familia, filas]) =>
        filas.map((f, i) => ({
          id: `${seccion}-${familia}-${i}`,
          seccion:
            seccion === "cocina"
              ? `Cocina / ${familia.charAt(0).toUpperCase() + familia.slice(1)}`
              : `Placard / ${familia.charAt(0).toUpperCase() + familia.slice(1)}`,
          descripcion: f.articulo,
          nombreart: f.nombreart ?? "",
          cantidad: parseFloat(f.cantidad) || 1,
          precio: parseFloat(f.precio) || 0,
          subtotal: (parseFloat(f.precio) || 0) * (parseFloat(f.cantidad) || 1),
          precios: f.precios ?? [],
          precioBase: f.precioBase ?? null,
          preciosBase: f.preciosBase ?? [],
          margen: f.margen ?? null,
          valor1: f.valor1 ?? null,
          porcentaje1: f.porcentaje1 ?? null,
          valor2: f.valor2 ?? null,
          porcentaje2: f.porcentaje2 ?? null,
          valor3: f.valor3 ?? null,
          porcentaje3: f.porcentaje3 ?? null,
        })),
      );

    const cocinaRows = toItems("cocina", cocinaItems);
    const placardRows = toItems("placard", placardItems);

    setPresupuestoItems((prev) => {
      // Mantener los ítems de mampara/especiales, reemplazar cocina/placard
      const otros = prev.filter(
        (p) => !p.id.startsWith("cocina-") && !p.id.startsWith("placard-"),
      );
      return [...cocinaRows, ...placardRows, ...otros];
    });
  }, [cocinaItems, placardItems]);

  // ── Resolución automática de cliente ────────────────────────────────────
  // Cuando el usuario carga nombre + teléfono a mano (sin elegir una
  // sugerencia de la lista):
  //   1) Busca coincidencia de nombre en nombre / nombre1 / nombre2.
  //   2) Si no hay, busca coincidencia de teléfono en telefono1 / telefono2 / wapp.
  //   3) Si encontró cliente por nombre pero el teléfono no coincide con
  //      ninguna de sus 3 casillas, agrega el teléfono a la primera casilla
  //      vacía (telefono1 → telefono2 → wapp).
  //   4) Si encontró cliente por teléfono pero el nombre no coincide con
  //      ninguna de sus 3 casillas, agrega el nombre a la primera casilla
  //      vacía de nombre (nombre1 → nombre2). No pisa el campo "nombre" principal.
  //   5) Si no encuentra nada por ninguno de los dos, da de alta el cliente solo.
  //
  // ⚠️ Asunciones sobre el backend (ajustar si no coinciden con tu API real):
  //   - GET /clientes/buscar-nombre?q=   ya busca también en nombre1 y nombre2.
  //   - GET /clientes/buscar-telefono?q= ya busca en telefono1, telefono2 y wapp.
  //   - PUT /clientes/:id  acepta un body parcial, ej { telefono2: "..." }.
  //   - POST /clientes acepta { nombre, telefono1 } y devuelve el cliente creado.
  useEffect(() => {
    if (cargandoPresupuestoRef.current) return; // no autoresolver mientras se está cargando un presupuesto existente
    if (codcliente) return; // ya está vinculado a un cliente (elegido o ya resuelto)

    const nombreVal = cliente.trim();
    const telVal = telefonoSearch.trim();
    if (!nombreVal || !telVal) return; // esperamos nombre Y teléfono

    // Compara ignorando mayúsculas/tildes/espacios
    const norm = (s) =>
      String(s ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const nombresDe = (c) => [
      c.nombre ?? c.NOMBRE ?? "",
      c.nombre1 ?? c.NOMBRE1 ?? "",
      c.nombre2 ?? c.NOMBRE2 ?? "",
    ];
    const telefonosDe = (c) => [
      c.telefono1 ?? c.TELEFONO1 ?? "",
      c.telefono2 ?? c.TELEFONO2 ?? "",
      c.wapp ?? c.WAPP ?? "",
    ];

    // Actualiza en el cliente encontrado el primer campo vacío de una lista dada
    const completarCasillaVacia = async (encontrado, campos, valor) => {
      const idCliente = encontrado.id ?? encontrado.codcliente ?? encontrado.CODCLIENTE;
      if (idCliente == null) return;
      const actual = {};
      campos.forEach((campo) => {
        actual[campo] = encontrado[campo] ?? encontrado[campo.toUpperCase()] ?? "";
      });
      const campoVacio = campos.find((campo) => !String(actual[campo] ?? "").trim());
      if (!campoVacio) return; // las 3 casillas ya están ocupadas, no forzamos nada
      try {
        await authFetch(`${API}/clientes/${idCliente}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [campoVacio]: valor }),
        });
      } catch (e) {
        console.error(`[autoresolverCliente] no se pudo completar ${campoVacio}:`, e);
      }
      return campoVacio;
    };

    const timer = setTimeout(async () => {
      setResolviendoCliente(true);
      try {
        let encontrado = null;
        let viaNombre = false;

        // 1) Buscar coincidencia en nombre / nombre1 / nombre2
        try {
          const rNombre = await authFetch(
            `${API}/clientes/buscar-nombre?q=${encodeURIComponent(nombreVal)}`,
          );
          const dNombre = await rNombre.json();
          if (Array.isArray(dNombre)) {
            encontrado = dNombre.find((c) =>
              nombresDe(c).some((n) => n && norm(n) === norm(nombreVal)),
            );
          }
        } catch (e) {
          console.error("[autoresolverCliente] error buscando por nombre:", e);
        }
        if (encontrado) viaNombre = true;

        // 2) Si no hay match por nombre, buscar coincidencia de teléfono
        if (!encontrado) {
          try {
            const rTel = await authFetch(
              `${API}/clientes/buscar-telefono?q=${encodeURIComponent(telVal)}`,
            );
            const dTel = await rTel.json();
            if (Array.isArray(dTel)) {
              encontrado =
                dTel.find((c) =>
                  telefonosDe(c).some((t) => t && norm(t) === norm(telVal)),
                ) ?? dTel[0] ?? null;
            }
          } catch (e) {
            console.error("[autoresolverCliente] error buscando por teléfono:", e);
          }
        }

        if (encontrado) {
          if (viaNombre) {
            // Encontrado por nombre → si el teléfono no está en ninguna de
            // sus 3 casillas, lo agregamos en la primera vacía.
            const telCoincide = telefonosDe(encontrado).some(
              (t) => t && norm(t) === norm(telVal),
            );
            if (!telCoincide) {
              await completarCasillaVacia(
                encontrado,
                ["telefono1", "telefono2", "wapp"],
                telVal,
              );
            }
          } else {
            // Encontrado por teléfono → si el nombre no está en ninguna de
            // sus 3 casillas, lo agregamos en nombre1/nombre2 (no tocamos "nombre").
            const nombreCoincide = nombresDe(encontrado).some(
              (n) => n && norm(n) === norm(nombreVal),
            );
            if (!nombreCoincide) {
              await completarCasillaVacia(
                encontrado,
                ["nombre1", "nombre2"],
                nombreVal,
              );
            }
          }

          // Vinculamos el cliente encontrado sin pisar lo que el usuario ya escribió
          setCodcliente(encontrado.codcliente ?? encontrado.CODCLIENTE ?? null);
          setTelefono1(encontrado.telefono1 ?? encontrado.TELEFONO1 ?? telVal);
          setTelefono2(encontrado.telefono2 ?? encontrado.TELEFONO2 ?? "");
          setWapp(encontrado.wapp ?? encontrado.WAPP ?? "");
          setDomicilio(encontrado.domrem ?? encontrado.DOMREM ?? "");
          setDomicilioFiscal(
            encontrado.domiciliofiscal ??
              encontrado["domicilio fiscal"] ??
              encontrado.DOMICILIO_FISCAL ??
              "",
          );
          setClienteAutoResuelto("existente");
        } else {
          // 3) No existe ni por nombre ni por teléfono → alta automática
          const rNuevo = await authFetch(`${API}/clientes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: nombreVal, telefono1: telVal }),
          });
          const dNuevo = await rNuevo.json();
          if (rNuevo.ok) {
            setCodcliente(
              dNuevo.codcliente ?? dNuevo.CODCLIENTE ?? dNuevo.id ?? null,
            );
            setTelefono1(telVal);
            setClienteAutoResuelto("nuevo");
          } else {
            console.error("[autoresolverCliente] no se pudo crear el cliente:", dNuevo);
          }
        }
      } finally {
        setResolviendoCliente(false);
      }
    }, 900); // esperamos a que el usuario termine de tipear ambos campos

    return () => clearTimeout(timer);
  }, [cliente, telefonoSearch, codcliente, numeroPres]);

  const setLinea = (idx, field, val) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)),
    );
  };

  const placard_total = (familia) =>
    placardItems[familia]?.reduce(
      (s, r) => s + (parseFloat(r.precio) || 0) * (parseFloat(r.cantidad) || 0),
      0,
    ) ?? 0;

  // Normaliza un string: minúsculas y sin tildes
  const normalizar = (s) =>
    String(s ?? "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // Devuelve la familia del producto desde el campo 'familia'
  const getProductoFamilia = (p) => normalizar(p.familia ?? p.FAMILIA ?? "");

  // Quita el sufijo de número de línea al final
  // Ejemplos: "Bajomesada 100 2 Ptas Nº 14" → "Bajomesada 100 2 Ptas"
  const nombreBase = (nombre) => {
    const s = String(nombre ?? "").trim();
    const result = s.replace(/\s+N.{0,3}\s*\d+\s*$/i, "").trim();
    return result || s;
  };

  // Líneas activas elegidas en el encabezado (sin "[Sin líneas]")
  const lineasActivas = lineas.filter(
    (l) => l.linea && l.linea !== "[Sin líneas]",
  );

  // Dado un nombre base, devuelve el precio para una línea específica (usa datos del nuevo endpoint)
  const getPrecioParaLinea = (base, lineaNombre) => {
    const art = articulosFamilia.find((a) => a.articulo === base);
    return art?.precios?.[String(lineaNombre)] ?? null;
  };

  // Placard tiene su propia línea de precios fija en la base de datos (línea 15),
  // independiente de las líneas que se hayan elegido en el Encabezado (16, 21, etc.).
  // Si el artículo no tiene precio cargado para ninguna de las líneas activas,
  // se usa la línea 15 como respaldo — sin necesidad de activarla en Encabezado.
  const LINEA_FIJA_PLACARD = "15";
  const resolverPrecioBasePlacard = (articuloBD) => {
    const preciosBase = lineasActivas.map((l) => ({
      linea: l.linea,
      precioBase: articuloBD.precios?.[String(l.linea)] ?? "",
    }));
    let precioBaseUsar = preciosBase[0]?.precioBase;
    if (precioBaseUsar == null || precioBaseUsar === "") {
      const p15 = articuloBD.precios?.[LINEA_FIJA_PLACARD];
      precioBaseUsar = p15 != null && p15 !== "" ? p15 : "";
    }
    return { preciosBase, precioBaseUsar };
  };

  // Filtra artículos por texto de búsqueda — solo para placard (cocina filtra internamente en TabCocina)
  const productosFiltrados = articulosFamilia.filter(
    (a) =>
      !placardSearch.trim() ||
      normalizar(a.articulo).includes(normalizar(placardSearch)),
  );

  // ── Helpers Placard ──────────────────────────────────────
  const placardAgregarFila = () => {
    if (!placardFila.articulo.trim()) return;
    setPlacardItems((prev) => ({
      ...prev,
      [placardFamilia]: [...(prev[placardFamilia] ?? []), { ...placardFila }],
    }));
    setPlacardFila({
      articulo: "",
      nombreart: "",
      cantidad: 1,
      precio: "",
      precios: [],
      precioPlacard: "",
      margen: null,
      valor1: null,
      porcentaje1: null,
      valor2: null,
      porcentaje2: null,
      valor3: null,
      porcentaje3: null,
    });
    setPlacardSearch("");
  };

  const placardEliminarFila = (idx) => {
    setPlacardItems((prev) => ({
      ...prev,
      [placardFamilia]: prev[placardFamilia].filter((_, i) => i !== idx),
    }));
  };

  const placardGuardarEdit = (idx) => {
    setPlacardItems((prev) => ({
      ...prev,
      [placardFamilia]: prev[placardFamilia].map((r, i) =>
        i === idx ? { ...placardFila } : r,
      ),
    }));
    setPlacardEditIdx(null);
    setPlacardFila({
      articulo: "",
      nombreart: "",
      cantidad: 1,
      precio: "",
      precios: [],
      precioPlacard: "",
      margen: null,
      valor1: null,
      porcentaje1: null,
      valor2: null,
      porcentaje2: null,
      valor3: null,
      porcentaje3: null,
    });
    setPlacardSearch("");
  };

  const placardIniciarEdit = (idx) => {
    const fila = placardItems[placardFamilia][idx];
    setPlacardFila({ ...fila });
    setPlacardSearch(fila.articulo);
    setPlacardEditIdx(idx);
  };

  const handleGuardar = async (esNuevaRev = false) => {
    const esEdicionExistente = numeroPres !== null;
    if (!cliente.trim() && !esEdicionExistente) {
      setError("El cliente es obligatorio.");
      return;
    }
    setError("");
    setGuardando(true);

    // Si ya tiene número asignado (presupuesto existente), enviar NUMERO
    // para que el backend cree una nueva revisión en tabla_indice.
    // Si es nuevo, no enviar NUMERO y el backend genera el numeropres automáticamente.
    const esEdicion = numeroPres !== null;

    const lineasElegidas = lineas
      .filter((l) => l.linea && l.linea !== "[Sin líneas]")
      .map((l) => l.linea);
    const payload = {
      numero: numeroPres ?? null,
      nombre: cliente,
      codcliente: codcliente,
      fecha: new Date().toISOString().slice(0, 10),
      lista: listaPrecio,
      lineasElegidas,
      // Si ya existe numeroPres, SIEMPRE nueva revisión (nunca pisar la anterior)
      nuevaRevision: esEdicion || esNuevaRev,
      presmv: presmv ?? null,
      ajusteValor: ajusteAplicado ? parseFloat(ajusteValor) || null : null,
      ajusteModo: ajusteAplicado ? ajusteModo : null,
      items: presupuestoItems.map((it) => {
        const v1 =
          parseFloat(it.precios?.[0]?.precio ?? it.valor1 ?? it.precio) || null;
        const v2 = parseFloat(it.precios?.[1]?.precio ?? it.valor2) || null;
        const v3 = parseFloat(it.precios?.[2]?.precio ?? it.valor3) || null;
        return {
          descripcion: it.descripcion,
          nombreart: it.nombreart ?? "",
          seccion: it.seccion,
          cantidad: it.cantidad,
          precio: it.precio,
          subtotal: it.subtotal,
          margen: it.margen ?? null,
          valor1: v1,
          porcentaje1: it.porcentaje1 ?? null,
          base1: parseFloat(it.preciosBase?.[0]?.precioBase ?? it.precioBase) || null,
          valor2: v2,
          porcentaje2: it.porcentaje2 ?? null,
          base2: parseFloat(it.preciosBase?.[1]?.precioBase) || null,
          valor3: v3,
          porcentaje3: it.porcentaje3 ?? null,
          base3: parseFloat(it.preciosBase?.[2]?.precioBase) || null,
          precios: it.precios ?? [],
          ancho: it.ancho ?? null,
          alto: it.alto ?? null,
          // Vinculación vanitory
          tabla: it.tabla ?? null,
          vtabla: it.vtabla ?? null,
          presv: it.presv ?? null,
          // Vinculación mampara
          presmv: it.presmv ?? null,
        };
      }),
    };
    console.log(
      "[handleGuardar] payload:",
      JSON.stringify({
        numero: payload.numero,
        nuevaRevision: payload.nuevaRevision,
        itemsCount: payload.items?.length,
        cliente: payload.nombre,
      }),
    );
    try {
      const res = await authFetch(`${API}/tabla-presupuestos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");

      // El servidor devuelve numero (= numeropres de tabla_indice) y revision
      const numAsignado = data.numero ?? data.NUMERO ?? data.id;
      const revAsignada = data.revision ?? data.REVISION ?? revision;
      if (numAsignado != null) {
        setNumeroPres(numAsignado);
        setNumero(String(numAsignado).padStart(4, "0"));

        // ── Vincular subpresupuestos vanitory huérfanos ──
        const vanitoryIds = presupuestoItems
          .filter((it) => it.seccion === "Vanitory" && it.vtabla != null)
          .map((it) => Number(it.vtabla));

        if (vanitoryIds.length > 0) {
          authFetch(`${API}/presupuestos-vanitory/vincular`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numeropres: numAsignado, ids: vanitoryIds }),
          }).catch(() => {});
        }
      }
      setRevision(Number(revAsignada));

      setGuardadoOk(true);
      onGuardado?.();
      setTimeout(() => setGuardadoOk(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Generar PDF del presupuesto ─────────────────────────────────────────────
  const handlePDF = () => {
    const formatPeso = (v) =>
      "$" +
      Number(v || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 });

    const fechaFmt = fecha
      ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : new Date().toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

    const nro =
      numeroPres != null
        ? String(numeroPres).padStart(5, "0")
        : numero !== "Nuevo"
          ? numero
          : "----";

    // Color de acento configurable desde el encabezado (si no se cargó, usa el azul de siempre)
    const accent = color && color.trim() ? color.trim() : "#2d7fc1";
    const accentLight = color && color.trim() ? color.trim() : "#60b4f0";

    // Cantidad de columnas de la tabla según qué se decida incluir
    // Si hay líneas cargadas, se muestra una columna de precio por cada línea
    // (igual que en la tabla "Presupuesto" en pantalla). Si no hay líneas, se
    // usa la columna única "Precio unit." controlada por incluirPrecio.
    const mostrarLineas = lineasActivas.length > 0;
    const colsExtra =
      (mostrarCosto ? 1 : 0) +
      (mostrarLineas ? lineasActivas.length : incluirPrecio ? 1 : 0);
    const totalCols = 3 + colsExtra + (incluirSubtotalItem ? 1 : 0); // producto+desc+cant + (costo/líneas) + (subtotal por ítem, opcional)

    // Agrupa los ítems por sección, respetando el orden en que fueron agregados
    const secciones = [...new Set(presupuestoItems.map((p) => p.seccion))];

    const filasHTML = secciones
      .map((sec) => {
        const items = presupuestoItems.filter((p) => p.seccion === sec);
        const subtotalSec = items.reduce((s, it) => s + (it.subtotal || 0), 0);
        const subtotalesLineaSec = mostrarLineas
          ? lineasActivas.map((l, li) =>
              items.reduce((s, it) => {
                const pr =
                  parseFloat(it.precios?.[li]?.precio ?? it.precio ?? 0) || 0;
                return s + pr * (parseFloat(it.cantidad) || 1);
              }, 0),
            )
          : [];

        const filasItems = items
          .map((item) => {
            const medida =
              item.seccion === "Mampara" && item.ancho && item.alto
                ? ` <span class="medida">(${item.ancho} × ${item.alto} cm)</span>`
                : "";
            const celdasPrecio = mostrarLineas
              ? lineasActivas
                  .map((l, li) => {
                    const pr = item.precios?.[li]?.precio ?? item.precio ?? 0;
                    return `<td class="right">${formatPeso(pr)}</td>`;
                  })
                  .join("")
              : incluirPrecio
                ? `<td class="right">${formatPeso(item.precio)}</td>`
                : "";
            return `
        <tr>
          <td>${item.nombreart ?? ""}</td>
          <td>${item.descripcion ?? ""}${medida}</td>
          <td class="center">${item.cantidad ?? 1}</td>
          ${mostrarCosto ? `<td class="right">${item.costo != null ? formatPeso(item.costo) : "—"}</td>` : ""}
          ${celdasPrecio}
          ${incluirSubtotalItem ? `<td class="right"><strong>${formatPeso(item.subtotal)}</strong></td>` : ""}
        </tr>`;
          })
          .join("");

        const labelColspan = 3 + (mostrarCosto ? 1 : 0);
        const celdasSubtotalLinea = mostrarLineas
          ? subtotalesLineaSec
              .map((st) => `<td class="right">${formatPeso(st)}</td>`)
              .join("")
          : incluirPrecio
            ? `<td class="right">${formatPeso(subtotalSec)}</td>`
            : "";
        const celdaSubtotalItem = incluirSubtotalItem
          ? `<td class="right">${formatPeso(subtotalSec)}</td>`
          : "";

        return `
      <tr class="seccion-row"><td colspan="${totalCols}">${sec}</td></tr>
      ${filasItems}
      <tr class="subtotal-row">
        <td colspan="${labelColspan}">Subtotal ${sec}</td>
        ${celdasSubtotalLinea}
        ${celdaSubtotalItem}
      </tr>`;
      })
      .join("");

    const totalGeneral = presupuestoItems.reduce(
      (s, it) => s + (it.subtotal || 0),
      0,
    );

    // Total por cada línea presupuestada (1, 2 o 3), igual que el TOTAL GENERAL en pantalla
    const totalesPorLinea = mostrarLineas
      ? lineasActivas.map((l, li) =>
          presupuestoItems.reduce((s, it) => {
            const pr =
              parseFloat(it.precios?.[li]?.precio ?? it.precio ?? 0) || 0;
            return s + pr * (parseFloat(it.cantidad) || 1);
          }, 0),
        )
      : [];

    const styleCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Source Sans 3', Arial, sans-serif; background: #fff; color: #1a2a3a; font-size: 13px; }
    .page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 0; display: flex; flex-direction: column; background: #fff; }
    .header { background: #0f2944; color: #fff; padding: 32px 48px 28px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-family: 'Rajdhani', sans-serif; font-size: 30px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .company-sub { font-size: 11px; color: #7ab2d4; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px; }
    .company-contact { font-size: 11px; color: #a8c4d8; margin-top: 10px; line-height: 1.7; }
    .header-right { text-align: right; }
    .doc-title { font-family: 'Rajdhani', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${accentLight}; }
    .doc-nro { font-family: 'Rajdhani', sans-serif; font-size: 42px; font-weight: 700; color: #fff; line-height: 1; }
    .doc-fecha { font-size: 11px; color: #7ab2d4; margin-top: 6px; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, ${accent} 0%, ${accentLight} 50%, ${accent} 100%); }
    .body { padding: 36px 48px; flex: 1; }
    .client-block { display: flex; gap: 24px; margin-bottom: 28px; }
    .info-box { flex: 1; border: 1px solid #d0dde8; border-radius: 6px; padding: 16px 20px; }
    .info-box-title { font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${accent}; margin-bottom: 10px; border-bottom: 1px solid #e8f0f7; padding-bottom: 6px; }
    .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .info-label { color: #6a8aa0; }
    .info-value { font-weight: 600; color: #0f2944; text-align: right; }
    .leyenda { font-size: 12px; font-style: italic; color: #4a6a8c; background: #f5f9fc; border-left: 3px solid ${accent}; padding: 10px 14px; margin-bottom: 24px; border-radius: 0 4px 4px 0; }
    .section-title { font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${accent}; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #0f2944; }
    thead th { color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 12px; text-align: left; }
    thead th.center { text-align: center; }
    thead th.right { text-align: right; }
    tbody td { padding: 8px 12px; font-size: 12px; color: #2a3a4a; border-bottom: 1px solid #e8f0f7; }
    tbody td.center { text-align: center; }
    tbody td.right { text-align: right; }
    .medida { color: #7a94a8; font-size: 11px; }
    tr.seccion-row td { background: #ddeefa; font-weight: 700; color: #0f2944; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 12px; }
    tr.subtotal-row td { background: #f5f9fc; font-weight: 700; color: #0a5c3a; text-align: right; padding: 7px 12px; border-top: 1px solid #d0dde8; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-box { width: 300px; }
    .totals-total { display: flex; justify-content: space-between; padding: 13px 16px; background: #0f2944; border-radius: 4px; }
    .totals-total + .totals-total { margin-top: 8px; }
    .totals-total .t-label { color: #a8c4d8; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; }
    .totals-total .t-value { color: #fff; font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; }
    .iva-note { font-size: 10px; color: #6a8aa0; text-align: right; margin-top: 6px; }
    .clausula { font-size: 11px; color: #6a8aa0; border-top: 1px dashed #d0dde8; padding-top: 10px; margin-bottom: 20px; }
    .observaciones { font-size: 12px; color: #2a3a4a; white-space: pre-wrap; margin-bottom: 20px; }
    .footer { background: #f0f6fb; border-top: 2px solid #d0dde8; padding: 20px 48px; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 11px; color: #6a8aa0; line-height: 1.6; }
    .footer-right { text-align: right; font-size: 11px; color: #6a8aa0; }
    .footer-brand { font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700; color: #0f2944; letter-spacing: 0.06em; }
    `;

    const pageHTML = `
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">Integral</div>
      <div class="company-sub">Muebles y equipamiento a medida</div>
      <div class="company-contact">
        📍 Bahía Blanca, Buenos Aires<br/>
        📞 291 - 000 0000
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">Presupuesto</div>
      <div class="doc-nro">N° ${nro}</div>
      <div class="doc-fecha">Fecha: ${fechaFmt}</div>
      <div class="doc-fecha" style="margin-top:4px; color:#a8c4d8;">Revisión: ${revision}</div>
    </div>
  </div>
  <div class="accent-bar"></div>
  <div class="body">
    <div class="client-block">
      <div class="info-box">
        <div class="info-box-title">Datos del cliente</div>
        <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${cliente || "Consumidor final"}</span></div>
        ${telefono1 ? `<div class="info-row"><span class="info-label">Teléfono</span><span class="info-value">${telefono1}</span></div>` : ""}
        ${telefono2 ? `<div class="info-row"><span class="info-label">Teléfono 2</span><span class="info-value">${telefono2}</span></div>` : ""}
        ${wapp ? `<div class="info-row"><span class="info-label">WhatsApp</span><span class="info-value">${wapp}</span></div>` : ""}
      </div>
      <div class="info-box">
        <div class="info-box-title">Domicilio</div>
        <div class="info-row"><span class="info-label">Domicilio</span><span class="info-value">${domicilio || "—"}</span></div>
        ${domicilioFiscal ? `<div class="info-row"><span class="info-label">Dom. fiscal</span><span class="info-value">${domicilioFiscal}</span></div>` : ""}
        <div class="info-row"><span class="info-label">Localidad</span><span class="info-value">${localidad || "—"}</span></div>
      </div>
    </div>

    ${leyenda ? `<div class="leyenda">${leyenda.replace(/\n/g, "<br/>")}</div>` : ""}

    <div class="section-title">Detalle del presupuesto</div>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Descripción</th>
          <th class="center">Cant.</th>
          ${mostrarCosto ? `<th class="right">Costo</th>` : ""}
          ${
            mostrarLineas
              ? lineasActivas
                  .map((l) => `<th class="right">Línea ${l.linea}</th>`)
                  .join("")
              : incluirPrecio
                ? `<th class="right">Precio unit.</th>`
                : ""
          }
          ${incluirSubtotalItem ? `<th class="right">Subtotal</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${filasHTML}
      </tbody>
    </table>

    ${
      incluirTotal
        ? `<div class="totals-wrap">
      <div class="totals-box">
        ${
          mostrarLineas
            ? totalesPorLinea
                .map(
                  (t, li) =>
                    `<div class="totals-total"><span class="t-label">TOTAL LÍNEA ${lineasActivas[li].linea}</span><span class="t-value">${formatPeso(t)}</span></div>`,
                )
                .join("")
            : `<div class="totals-total"><span class="t-label">TOTAL</span><span class="t-value">${formatPeso(totalGeneral)}</span></div>`
        }
        ${agregarIVA ? `<div class="iva-note">Precios con IVA incluido</div>` : ""}
      </div>
    </div>`
        : ""
    }

    ${
      incluirTextoColoc
        ? `<div class="clausula">La colocación no está incluida en este presupuesto, salvo que se indique lo contrario.</div>`
        : ""
    }

    ${
      observaciones
        ? `<div class="section-title" style="margin-top:8px;">Observaciones</div><div class="observaciones">${observaciones.replace(/\n/g, "<br/>")}</div>`
        : ""
    }
  </div>
  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">Integral</div>
      Bahía Blanca, Buenos Aires
    </div>
    <div class="footer-right">
      Presupuesto N° ${nro} — Rev. ${revision}<br/>
      Emitido el ${fechaFmt}
    </div>
  </div>
</div>`;

    // Genera el PDF real en el cliente (html2pdf.js = html2canvas + jsPDF) y lo descarga.
    // Reemplaza al viejo mecanismo de window.print(), que dependía de que el
    // navegador abriera solo el diálogo de impresión — poco confiable en algunos
    // navegadores/extensiones.
    const generarDescarga = () => {
      setGenerandoPDF(true);
      const contenedor = document.createElement("div");
      contenedor.style.cssText =
        "position:fixed; left:-9999px; top:0; width:794px; background:#fff; z-index:-1;";
      contenedor.innerHTML = `<style>${styleCSS}</style>${pageHTML}`;
      document.body.appendChild(contenedor);

      const limpiar = () => {
        if (contenedor.parentNode) contenedor.parentNode.removeChild(contenedor);
        setGenerandoPDF(false);
      };

      const paginaEl = contenedor.querySelector(".page");
      const esperarFuentes =
        document.fonts && document.fonts.ready
          ? document.fonts.ready
          : Promise.resolve();

      esperarFuentes
        .then(() => new Promise((resolve) => setTimeout(resolve, 300)))
        .then(() =>
          window
            .html2pdf()
            .set({
              margin: 0,
              filename: `Presupuesto_${nro}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
              },
              jsPDF: {
                unit: "px",
                format: [794, Math.max(paginaEl.scrollHeight, 1123)],
                orientation: "portrait",
              },
            })
            .from(paginaEl)
            .save(),
        )
        .catch((err) => {
          console.error("Error generando PDF:", err);
          alert("Ocurrió un error generando el PDF. Probá de nuevo.");
        })
        .finally(limpiar);
    };

    if (window.html2pdf) {
      generarDescarga();
    } else {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = generarDescarga;
      script.onerror = () => {
        alert(
          "No se pudo cargar el generador de PDF. Revisá la conexión a internet e intentá de nuevo.",
        );
      };
      document.head.appendChild(script);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');

        .pn-root {
          font-family: 'Space Mono', monospace;
          background: #f0f4f8;
          min-height: 100vh;
          color: #1a2332;
        }

        /* ── Barra superior ── */
        .pn-topbar {
          background: #e8f0f7;
          border-bottom: 1px solid #b8cfe0;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 0;
          height: 36px;
        }
        .pn-topbar-title {
          font-size: 12px;
          color: #0a3a5c;
          font-weight: 700;
          margin-right: 16px;
          letter-spacing: 0.04em;
        }
        .pn-menu-item {
          font-size: 12px;
          color: #0a3a5c;
          padding: 0 14px;
          height: 36px;
          display: flex;
          align-items: center;
          cursor: pointer;
          border-right: 1px solid #c8dae8;
          transition: background 0.12s;
        }
        .pn-menu-item:first-of-type { border-left: 1px solid #c8dae8; }
        .pn-menu-item:hover { background: #d0e4f0; }

        /* ── Toolbar ── */
        .pn-toolbar {
          background: #f5f8fb;
          border-bottom: 1px solid #c8dae8;
          padding: 6px 16px;
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .pn-tool-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 14px;
          background: #fff;
          border: 1px solid #b8cfe0;
          border-radius: 2px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: #0a3a5c;
          cursor: pointer;
          transition: all 0.12s;
        }
        .pn-tool-btn:hover { background: #ddeefa; border-color: #7aaac8; }
        .pn-tool-btn:active { background: #c8e0f0; }
        .pn-tool-btn.save { background: #fff; }

        /* ── Tabs ── */
        .pn-tabs {
          background: #f0f4f8;
          border-bottom: 1px solid #c8dae8;
          padding: 0 16px;
          display: flex;
          gap: 2px;
          padding-top: 6px;
        }
        .pn-tab {
          padding: 6px 18px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          cursor: pointer;
          border: 1px solid transparent;
          border-bottom: none;
          border-radius: 3px 3px 0 0;
          color: #6699bb;
          background: transparent;
          transition: all 0.12s;
        }
        .pn-tab:hover { background: #ddeefa; color: #0a3a5c; }
        .pn-tab.active {
          background: #fff;
          border-color: #b8cfe0;
          color: #0a3a5c;
          font-weight: 700;
          position: relative;
          bottom: -1px;
        }

        /* ── Cuerpo ── */
        .pn-body {
          background: #fff;
          border: 1px solid #c8dae8;
          margin: 0 16px 16px;
          padding: 24px 32px;
        }

        /* ── Encabezado del presupuesto ── */
        .pn-header-row {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .pn-numero-label {
          font-size: 16px;
          font-weight: 700;
          color: #0a3a5c;
          letter-spacing: 0.04em;
        }
        .pn-numero-val {
          font-size: 16px;
          color: #2277bb;
          font-weight: 700;
        }
        .pn-rev-group {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #0a3a5c;
        }
        .pn-rev-input {
          width: 56px; padding: 3px 7px;
          border: 1px solid #b8cfe0; border-radius: 2px;
          font-family: 'Space Mono', monospace; font-size: 13px;
          text-align: center; color: #0a3a5c;
        }

        .pn-field-row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 12px; flex-wrap: wrap;
        }
        .pn-field-label {
          font-size: 12px; color: #0a3a5c; font-weight: 700;
          min-width: 70px;
        }
        .pn-field-input {
          flex: 1; max-width: 460px;
          padding: 5px 10px;
          border: 1px solid #b8cfe0; border-radius: 2px;
          font-family: 'Space Mono', monospace; font-size: 12px;
          color: #0a3a5c; background: #fff;
          outline: none;
        }
        .pn-field-input:focus { border-color: #4a8ab5; box-shadow: 0 0 0 2px #4a8ab520; }
        .pn-field-select {
          padding: 5px 10px;
          border: 1px solid #b8cfe0; border-radius: 2px;
          font-family: 'Space Mono', monospace; font-size: 12px;
          color: #0a3a5c; background: #fff;
          outline: none; cursor: pointer;
        }
        .pn-field-select:focus { border-color: #4a8ab5; }

        /* ── Fecha ── */
        .pn-fecha-group { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .pn-fecha-label { font-size: 12px; color: #0a3a5c; font-weight: 700; }
        .pn-fecha-text { font-size: 12px; color: #334155; }

        /* ── Sección líneas ── */
        .pn-section-label {
          font-size: 11px; font-weight: 700; color: #0a3a5c;
          letter-spacing: 0.08em; text-transform: uppercase;
          margin: 18px 0 8px;
        }
        .pn-lineas-grid {
          display: grid;
          grid-template-columns: 200px 1fr 1fr;
          gap: 6px;
          margin-bottom: 4px;
        }
        .pn-linea-row { display: contents; }

        /* ── Sección precios ── */
        .pn-precios-wrap {
          border: 1px solid #c8dae8;
          border-radius: 3px;
          padding: 14px 18px;
          margin-bottom: 14px;
          background: #f8fbfd;
          display: flex;
          gap: 32px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .pn-lista-group { display: flex; align-items: center; gap: 8px; }
        .pn-check-group { display: flex; flex-direction: column; gap: 5px; }
        .pn-check-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #334155; cursor: pointer; }
        .pn-check-row input[type="checkbox"] { cursor: pointer; accent-color: #2277bb; }
        .pn-color-group { display: flex; align-items: center; gap: 8px; }
        .pn-color-label { font-size: 12px; color: #0a3a5c; }
        .pn-color-input {
          padding: 4px 8px; width: 120px;
          border: 1px solid #b8cfe0; border-radius: 2px;
          font-family: 'Space Mono', monospace; font-size: 12px;
        }
        .pn-right-checks { display: flex; flex-direction: column; gap: 5px; margin-left: auto; }

        /* ── Textarea ── */
        .pn-textarea {
          width: 100%; padding: 8px 10px;
          border: 1px solid #b8cfe0; border-radius: 2px;
          font-family: 'Space Mono', monospace; font-size: 12px;
          color: #0a3a5c; resize: vertical; outline: none;
          background: #fff; box-sizing: border-box;
        }
        .pn-textarea:focus { border-color: #4a8ab5; box-shadow: 0 0 0 2px #4a8ab520; }

        /* ── Feedback ── */
        .pn-error { font-size: 12px; color: #dc2626; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 3px; padding: 6px 12px; margin-bottom: 10px; }
        .pn-ok    { font-size: 12px; color: #16a34a; background: #f0fdf4; border: 1px solid #86efac; border-radius: 3px; padding: 6px 12px; margin-bottom: 10px; }

        /* ── Tab módulos placeholder ── */
        .pn-modulos-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 20px; gap: 10px; color: #94a3b8;
        }

        /* ── Precio editable inline ── */
        .pn-precio-cell {
          cursor: pointer;
          border-radius: 2px;
          padding: 2px 4px;
          transition: background 0.1s;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .pn-precio-cell:hover { background: #ddeefa; }
        .pn-precio-cell::after {
          content: "✏️";
          font-size: 10px;
          opacity: 0;
          transition: opacity 0.12s;
        }
        .pn-precio-cell:hover::after { opacity: 1; }

        /* ── Popover de precio ── */
        .pn-popover-backdrop {
          position: fixed; inset: 0; z-index: 200;
        }
        .pn-popover {
          position: fixed; z-index: 201;
          background: #fff; border: 1px solid #7aaac8;
          border-radius: 4px; box-shadow: 0 8px 24px #0a3a5c22;
          padding: 12px 14px; min-width: 240px;
          font-family: 'Space Mono', monospace; font-size: 12px;
        }
        .pn-popover-title { font-size: 10px; color: #6699bb; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .pn-pop-toggle { display: flex; border: 1px solid #b8cfe0; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
        .pn-pop-toggle button {
          flex: 1; padding: 4px 0; border: none; cursor: pointer;
          font-family: 'Space Mono', monospace; font-size: 11px;
          background: #fff; color: #0a3a5c; transition: all 0.1s;
        }
        .pn-pop-toggle button.active { background: #0a3a5c; color: #fff; font-weight: 700; }
        .pn-pop-input-row { display: flex; gap: 6px; align-items: center; }
        .pn-pop-input {
          flex: 1; padding: 5px 8px; border: 1px solid #b8cfe0; border-radius: 2px;
          font-family: 'Space Mono', monospace; font-size: 12px; color: #0a3a5c; outline: none;
        }
        .pn-pop-input:focus { border-color: #4a8ab5; }
        .pn-pop-confirm { padding: 5px 12px; background: #0a3a5c; color: #fff; border: none; border-radius: 2px; cursor: pointer; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; }
        .pn-pop-cancel  { padding: 5px 10px; background: #fff; color: #6699bb; border: 1px solid #c8dae8; border-radius: 2px; cursor: pointer; font-family: 'Space Mono', monospace; font-size: 12px; }
        .pn-pop-hint { font-size: 10px; color: #99aabb; margin-top: 6px; }
      `}</style>

      <div className="pn-root">
        {/* ── Popover de ajuste de precio ── */}
        {precioPopover &&
          (() => {
            const rect = precioPopover.rect;
            const top = Math.min(rect.bottom + 6, window.innerHeight - 180);
            const left = Math.min(rect.left, window.innerWidth - 260);
            return (
              <>
                <div className="pn-popover-backdrop" onClick={cerrarPopover} />
                <div
                  className="pn-popover"
                  style={{ top, left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pn-popover-title">Ajustar precio</div>
                  <div className="pn-pop-toggle">
                    <button
                      className={popoverModo === "valor" ? "active" : ""}
                      onClick={() => {
                        setPopoverModo("valor");
                        setPopoverInput(
                          String(precioPopover.precioActual ?? ""),
                        );
                      }}
                    >
                      $ Valor
                    </button>
                    <button
                      className={popoverModo === "porcentaje" ? "active" : ""}
                      onClick={() => {
                        setPopoverModo("porcentaje");
                        setPopoverInput("");
                      }}
                    >
                      % Porcentaje
                    </button>
                  </div>
                  <div className="pn-pop-input-row">
                    <span style={{ color: "#6699bb", fontSize: 13 }}>
                      {popoverModo === "valor" ? "$" : "%"}
                    </span>
                    <input
                      autoFocus
                      type="number"
                      className="pn-pop-input"
                      value={popoverInput}
                      onChange={(e) => setPopoverInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarPopover();
                        if (e.key === "Escape") cerrarPopover();
                      }}
                      placeholder={
                        popoverModo === "valor" ? "Nuevo precio" : "ej: 10 ó -5"
                      }
                    />
                    <button
                      className="pn-pop-confirm"
                      onClick={confirmarPopover}
                    >
                      ✓
                    </button>
                    <button className="pn-pop-cancel" onClick={cerrarPopover}>
                      ✕
                    </button>
                  </div>
                  <div className="pn-pop-hint">
                    {popoverModo === "valor"
                      ? `Precio actual: $${Number(precioPopover.precioActual).toLocaleString("es-AR", { minimumFractionDigits: 2 })}${precioPopover.porcentajeActual != null ? ` (${precioPopover.porcentajeActual > 0 ? "+" : ""}${precioPopover.porcentajeActual}% aplicado)` : ""}`
                      : precioPopover.porcentajeActual != null
                        ? `% actual: ${precioPopover.porcentajeActual > 0 ? "+" : ""}${precioPopover.porcentajeActual}% · Positivo = aumento · Negativo = descuento`
                        : "Positivo = aumento · Negativo = descuento"}
                  </div>
                </div>
              </>
            );
          })()}

        {/* ── Popover de edición de precio en solapa Presupuesto ── */}
        {presItemPopover &&
          (() => {
            const rect = presItemPopover.rect;
            const top = Math.min(rect.bottom + 6, window.innerHeight - 200);
            const left = Math.min(rect.left, window.innerWidth - 260);
            return (
              <>
                <div
                  className="pn-popover-backdrop"
                  onClick={cerrarPresItemPopover}
                />
                <div
                  className="pn-popover"
                  style={{ top, left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pn-popover-title">Editar precio</div>
                  <div className="pn-pop-toggle">
                    <button
                      className={presItemModo === "valor" ? "active" : ""}
                      onClick={() => {
                        setPresItemModo("valor");
                        setPresItemInput(
                          String(presItemPopover.precioActual ?? ""),
                        );
                      }}
                    >
                      $ Monto
                    </button>
                    <button
                      className={presItemModo === "porcentaje" ? "active" : ""}
                      onClick={() => {
                        setPresItemModo("porcentaje");
                        setPresItemInput("");
                      }}
                    >
                      % Porcentaje
                    </button>
                  </div>
                  <div className="pn-pop-input-row">
                    <span style={{ color: "#6699bb", fontSize: 13 }}>
                      {presItemModo === "valor" ? "$" : "%"}
                    </span>
                    <input
                      autoFocus
                      type="number"
                      className="pn-pop-input"
                      value={presItemInput}
                      onChange={(e) => setPresItemInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarPresItemPopover();
                        if (e.key === "Escape") cerrarPresItemPopover();
                      }}
                      placeholder={
                        presItemModo === "valor"
                          ? "Nuevo precio"
                          : "ej: 10 ó -5"
                      }
                    />
                    <button
                      className="pn-pop-confirm"
                      onClick={confirmarPresItemPopover}
                    >
                      ✓
                    </button>
                    <button
                      className="pn-pop-cancel"
                      onClick={cerrarPresItemPopover}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="pn-pop-hint">
                    {presItemModo === "valor"
                      ? `Precio actual: $${Number(presItemPopover.precioActual).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                      : "Positivo = aumento · Negativo = descuento"}
                  </div>
                </div>
              </>
            );
          })()}

        {/* Barra de título */}
        <div className="pn-topbar">
          <span className="pn-topbar-title">Sistema de presupuestos</span>
          <span className="pn-menu-item">Precios</span>
          <span
            className="pn-menu-item"
            style={{ cursor: "pointer" }}
            onClick={() => onVerTabla && onVerTabla()}
          >
            Presupuestos
          </span>
          <span className="pn-menu-item">Sistema</span>
        </div>

        {/* Toolbar */}
        <div className="pn-toolbar">
          <button
            className="pn-tool-btn"
            onClick={onVolver}
            style={{
              background: "#0a3a5c",
              color: "#60efff",
              borderColor: "#0a3a5c",
              fontWeight: 700,
            }}
            title="Volver al inicio"
          >
            🏠 Inicio
          </button>
          <button
            className="pn-tool-btn"
            onClick={handleActualizar}
            title="Actualiza el presupuesto con los parámetros actuales del encabezado"
            style={{
              background: "#e8f5e9",
              borderColor: "#4caf50",
              color: "#1b5e20",
              fontWeight: 700,
            }}
          >
            🔄 Actualizar
          </button>
          {numeroPres === null && (
            <button
              className="pn-tool-btn save"
              onClick={() => handleGuardar(false)}
              disabled={guardando}
            >
              💾 {guardando ? "Guardando..." : "Guardar"}
            </button>
          )}
          {numeroPres !== null && (
            <button
              className="pn-tool-btn"
              onClick={() => handleGuardar(true)}
              disabled={guardando}
              style={{
                background: "#fff3cd",
                borderColor: "#ffc107",
                color: "#856404",
                fontWeight: 700,
              }}
            >
              🔖 {guardando ? "Guardando..." : "Nueva Revisión"}
            </button>
          )}
          <button
            className="pn-tool-btn"
            onClick={handlePDF}
            disabled={presupuestoItems.length === 0 || generandoPDF}
            title={
              presupuestoItems.length === 0
                ? "Agregá al menos un ítem al presupuesto para generar el PDF"
                : "Genera y descarga el PDF del presupuesto"
            }
            style={{
              background: "#e8f0f7",
              borderColor: "#2277bb",
              color: "#0a3a5c",
              fontWeight: 700,
              opacity: presupuestoItems.length === 0 || generandoPDF ? 0.5 : 1,
            }}
          >
            🖨️ {generandoPDF ? "Generando..." : "Generar PDF"}
          </button>
        </div>

        {/* Tabs */}
        <div className="pn-tabs">
          <button
            className={`pn-tab${tab === "encabezado" ? " active" : ""}`}
            onClick={() => setTab("encabezado")}
          >
            Encabezado
          </button>
          <button
            className={`pn-tab${tab === "cocina" ? " active" : ""}`}
            onClick={() => setTab("cocina")}
          >
            Cocina
          </button>
          <button
            className={`pn-tab${tab === "placard" ? " active" : ""}`}
            onClick={() => setTab("placard")}
          >
            Placard
          </button>
          <button
            className={`pn-tab${tab === "mampara" ? " active" : ""}`}
            onClick={() => setTab("mampara")}
          >
            Mampara
          </button>
          <button
            className={`pn-tab${tab === "especiales" ? " active" : ""}`}
            onClick={() => setTab("especiales")}
          >
            Especiales
          </button>
          <button
            className={`pn-tab${tab === "presupuesto" ? " active" : ""}`}
            onClick={() => setTab("presupuesto")}
          >
            Presupuesto
          </button>
        </div>

        {/* Cuerpo */}
        <div className="pn-body">
          {error && <div className="pn-error">⚠️ {error}</div>}
          {guardadoOk && (
            <div className="pn-ok">✅ Presupuesto guardado correctamente</div>
          )}

          {tab === "encabezado" && (
            <>
              {/* Número y revisión */}
              <div className="pn-header-row">
                <span className="pn-numero-label">
                  Presupuesto número:&nbsp;
                  <span className="pn-numero-val">[{numero}]</span>
                </span>
                <div className="pn-rev-group">
                  <span>Revisión:</span>
                  <input
                    className="pn-rev-input"
                    type="number"
                    min="1"
                    value={revision}
                    onChange={(e) => setRevision(Number(e.target.value))}
                  />
                </div>
                <div className="pn-fecha-group">
                  <span className="pn-fecha-label">Fecha:</span>
                  <span className="pn-fecha-text">
                    {formatFechaLarga(fecha)}
                  </span>
                  <input
                    type="date"
                    className="pn-field-select"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    style={{ marginLeft: 4 }}
                  />
                </div>
              </div>

              {/* Cliente + Teléfono */}
              <div
                className="pn-field-row"
                style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}
              >
                <span className="pn-field-label" style={{ paddingTop: 7 }}>
                  Cliente:
                </span>

                {/* Campo cliente — busca por nombre en BD, o ingresa nuevo */}
                <div
                  style={{
                    position: "relative",
                    flex: "2 1 200px",
                    minWidth: 160,
                  }}
                >
                  <input
                    className="pn-field-input"
                    value={cliente}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCliente(val);
                      setCodcliente(null); // resetear si escribe a mano
                      setClienteAutoResuelto(null);
                      clearTimeout(window._clienteTimer);
                      if (val.length > 1) {
                        window._clienteTimer = setTimeout(() => {
                          authFetch(
                            `${API}/clientes/buscar-nombre?q=${encodeURIComponent(val)}`,
                          )
                            .then((r) => r.json())
                            .then((data) =>
                              setClientesSugeridos(
                                Array.isArray(data) ? data : [],
                              ),
                            )
                            .catch(() => {});
                        }, 250);
                      } else {
                        setClientesSugeridos([]);
                      }
                    }}
                    onBlur={() => setClientesSugeridos([])}
                    placeholder="Nombre o nuevo cliente..."
                    autoComplete="off"
                    style={{ width: "100%" }}
                  />
                  {clientesSugeridos.length > 0 && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #b8cfe0",
                        zIndex: 50,
                        boxShadow: "0 4px 12px #0002",
                        maxHeight: 220,
                        overflowY: "auto",
                        borderRadius: "0 0 3px 3px",
                      }}
                    >
                      {clientesSugeridos.map((c, i) => {
                        const nombre = c.nombre ?? c.NOMBRE ?? "";
                        const loc = c.localidad ?? c.LOCALIDAD ?? "";
                        const tel1 = c.telefono1 ?? c.TELEFONO1 ?? "";
                        const tel2 = c.telefono2 ?? c.TELEFONO2 ?? "";
                        const wp = c.wapp ?? c.WAPP ?? "";
                        return (
                          <div
                            key={i}
                            onMouseDown={() => {
                              setCliente(nombre);
                              setCodcliente(
                                c.codcliente ?? c.CODCLIENTE ?? null,
                              );
                              setTelefono1(tel1);
                              setTelefono2(tel2);
                              setWapp(wp);
                              setDomicilio(c.domrem ?? c.DOMREM ?? "");
                              setDomicilioFiscal(
                                c.domiciliofiscal ??
                                  c["domicilio fiscal"] ??
                                  c.DOMICILIO_FISCAL ??
                                  "",
                              );
                              setTelefonoSearch(tel1 || tel2 || wp);
                              setClienteAutoResuelto("existente");
                              setClientesSugeridos([]);
                            }}
                            style={{
                              padding: "8px 14px",
                              cursor: "pointer",
                              fontSize: 12,
                              borderBottom: "1px solid #eef2f6",
                              fontFamily: "'Space Mono',monospace",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.background = "#ddeefa")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.background = "#fff")
                            }
                          >
                            <div style={{ fontWeight: 700, color: "#0a3a5c" }}>
                              {nombre}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6699bb",
                                marginTop: 2,
                                display: "flex",
                                gap: 10,
                              }}
                            >
                              {tel1 && <span>📞 {tel1}</span>}
                              {tel2 && <span>📞 {tel2}</span>}
                              {wp && <span>💬 {wp}</span>}
                              {loc && <span>📍 {loc}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Campo teléfono — busca en telefono1, telefono2, wapp */}
                <div
                  style={{
                    position: "relative",
                    flex: "1 1 150px",
                    minWidth: 140,
                  }}
                >
                  <input
                    className="pn-field-input"
                    value={telefonoSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTelefonoSearch(val);
                      clearTimeout(window._telTimer);
                      if (val.length > 1) {
                        window._telTimer = setTimeout(() => {
                          authFetch(
                            `${API}/clientes/buscar-telefono?q=${encodeURIComponent(val)}`,
                          )
                            .then((r) => r.json())
                            .then((data) =>
                              setTelefonosSugeridos(
                                Array.isArray(data) ? data : [],
                              ),
                            )
                            .catch(() => {});
                        }, 250);
                      } else {
                        setTelefonosSugeridos([]);
                      }
                    }}
                    onBlur={() => setTelefonosSugeridos([])}
                    placeholder="📞 Teléfono..."
                    autoComplete="off"
                    style={{ width: "100%" }}
                  />
                  {telefonosSugeridos.length > 0 && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #b8cfe0",
                        zIndex: 50,
                        boxShadow: "0 4px 12px #0002",
                        maxHeight: 220,
                        overflowY: "auto",
                        borderRadius: "0 0 3px 3px",
                      }}
                    >
                      {telefonosSugeridos.map((c, i) => {
                        const nombre = c.nombre ?? c.NOMBRE ?? "";
                        const tel1 = c.telefono1 ?? c.TELEFONO1 ?? "";
                        const tel2 = c.telefono2 ?? c.TELEFONO2 ?? "";
                        const wp = c.wapp ?? c.WAPP ?? "";
                        return (
                          <div
                            key={i}
                            onMouseDown={() => {
                              setCliente(nombre);
                              setCodcliente(
                                c.codcliente ?? c.CODCLIENTE ?? null,
                              );
                              setTelefono1(tel1);
                              setTelefono2(tel2);
                              setWapp(wp);
                              setDomicilio(c.domrem ?? c.DOMREM ?? "");
                              setDomicilioFiscal(
                                c.domiciliofiscal ??
                                  c["domicilio fiscal"] ??
                                  c.DOMICILIO_FISCAL ??
                                  "",
                              );
                              setTelefonoSearch(tel1 || tel2 || wp);
                              setClienteAutoResuelto("existente");
                              setTelefonosSugeridos([]);
                            }}
                            style={{
                              padding: "8px 14px",
                              cursor: "pointer",
                              fontSize: 12,
                              borderBottom: "1px solid #eef2f6",
                              fontFamily: "'Space Mono',monospace",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.background = "#ddeefa")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.background = "#fff")
                            }
                          >
                            <div style={{ fontWeight: 700, color: "#0a3a5c" }}>
                              {nombre}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6699bb",
                                marginTop: 2,
                                display: "flex",
                                gap: 10,
                              }}
                            >
                              {tel1 && <span>📞 {tel1}</span>}
                              {tel2 && <span>📞 {tel2}</span>}
                              {wp && <span>💬 {wp}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Estado de la resolución automática de cliente */}
                {resolviendoCliente && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#4a8ab5",
                      fontFamily: "'Space Mono',monospace",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    🔎 Verificando cliente...
                  </span>
                )}
                {!resolviendoCliente && clienteAutoResuelto === "existente" && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#1b5e20",
                      fontFamily: "'Space Mono',monospace",
                    }}
                  >
                    ✅ Cliente existente vinculado
                  </span>
                )}
                {!resolviendoCliente && clienteAutoResuelto === "nuevo" && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#856404",
                      fontFamily: "'Space Mono',monospace",
                    }}
                  >
                    🆕 Cliente nuevo dado de alta
                  </span>
                )}

                {/* Chips de teléfonos del cliente seleccionado */}
                {(telefono1 || telefono2 || wapp) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {telefono1 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#0a3a5c",
                          background: "#e8f0f7",
                          border: "1px solid #c8dae8",
                          borderRadius: 3,
                          padding: "4px 10px",
                          fontFamily: "'Space Mono',monospace",
                        }}
                      >
                        📞 {telefono1}
                      </span>
                    )}
                    {telefono2 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#0a3a5c",
                          background: "#e8f0f7",
                          border: "1px solid #c8dae8",
                          borderRadius: 3,
                          padding: "4px 10px",
                          fontFamily: "'Space Mono',monospace",
                        }}
                      >
                        📞 {telefono2}
                      </span>
                    )}
                    {wapp && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#1a7a3a",
                          background: "#e6f5eb",
                          border: "1px solid #a8d8b0",
                          borderRadius: 3,
                          padding: "4px 10px",
                          fontFamily: "'Space Mono',monospace",
                        }}
                      >
                        💬 {wapp}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Localidad */}
              <div className="pn-field-row">
                <span className="pn-field-label">Localidad:</span>
                <select
                  className="pn-field-select"
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  style={{ minWidth: 200 }}
                >
                  {LOCALIDADES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Domicilio */}
              {(domicilio || domicilioFiscal) && (
                <div
                  className="pn-field-row"
                  style={{ flexWrap: "wrap", gap: 12 }}
                >
                  {domicilio && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: "1 1 200px",
                      }}
                    >
                      <span className="pn-field-label">Domicilio:</span>
                      <input
                        className="pn-field-input"
                        value={domicilio}
                        onChange={(e) => setDomicilio(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}
                  {domicilioFiscal && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flex: "1 1 200px",
                      }}
                    >
                      <span className="pn-field-label">Dom. Fiscal:</span>
                      <input
                        className="pn-field-input"
                        value={domicilioFiscal}
                        onChange={(e) => setDomicilioFiscal(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Líneas */}
              <div className="pn-section-label">Líneas a presupuestar:</div>
              <div className="pn-lineas-grid">
                {lineas.map((l, idx) => (
                  <div key={idx} className="pn-linea-row">
                    <select
                      className="pn-field-select"
                      value={l.linea}
                      onChange={(e) => setLinea(idx, "linea", e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <option value="[Sin líneas]">[Sin líneas]</option>
                      {lineasBD.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <input
                      className="pn-field-input"
                      style={{ maxWidth: "100%" }}
                      value={l.col2}
                      onChange={(e) => setLinea(idx, "col2", e.target.value)}
                      placeholder=""
                      disabled={l.linea === "[Sin líneas]"}
                    />
                    <input
                      className="pn-field-input"
                      style={{ maxWidth: "100%" }}
                      value={l.col3}
                      onChange={(e) => setLinea(idx, "col3", e.target.value)}
                      placeholder=""
                      disabled={l.linea === "[Sin líneas]"}
                    />
                  </div>
                ))}
              </div>

              {/* Precios */}
              <div className="pn-section-label" style={{ marginTop: 20 }}>
                Precios
              </div>
              <div className="pn-precios-wrap">
                <div className="pn-lista-group">
                  <span style={{ fontSize: 12, color: "#0a3a5c" }}>
                    Lista de precios:
                  </span>
                  <select
                    className="pn-field-select"
                    value={listaPrecio}
                    onChange={(e) => setListaPrecio(e.target.value)}
                  >
                    {listasDB.length === 0 ? (
                      <option value="">Cargando...</option>
                    ) : (
                      listasDB.map((l) => (
                        <option key={l.id} value={l.lista}>
                          {l.lista}
                        </option>
                      ))
                    )}
                  </select>
                  {listaPorcentaje !== 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'Space Mono',monospace",
                        fontWeight: 700,
                        color: "#fff",
                        background: "#2277bb",
                        borderRadius: 4,
                        padding: "3px 10px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      +{listaPorcentaje}% sobre precio base
                    </span>
                  )}
                </div>

                <div className="pn-check-group">
                  <label className="pn-check-row">
                    <input
                      type="checkbox"
                      checked={mostrarCosto}
                      onChange={(e) => setMostrarCosto(e.target.checked)}
                    />{" "}
                    Mostrar costo
                  </label>
                  <label className="pn-check-row">
                    <input
                      type="checkbox"
                      checked={incluirPrecio}
                      onChange={(e) => setIncluirPrecio(e.target.checked)}
                    />{" "}
                    Incluir precio
                  </label>
                  <label className="pn-check-row">
                    <input
                      type="checkbox"
                      checked={incluirSubtotalItem}
                      onChange={(e) =>
                        setIncluirSubtotalItem(e.target.checked)
                      }
                    />{" "}
                    Incluir subtotal por ítem
                  </label>
                  <label className="pn-check-row">
                    <input
                      type="checkbox"
                      checked={incluirTotal}
                      onChange={(e) => setIncluirTotal(e.target.checked)}
                    />{" "}
                    Incluir total
                  </label>
                </div>

                <div className="pn-color-group">
                  <span className="pn-color-label">Color:</span>
                  <input
                    className="pn-color-input"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder=""
                  />
                </div>

                <div className="pn-right-checks">
                  <label className="pn-check-row">
                    <input
                      type="checkbox"
                      checked={incluirTextoColoc}
                      onChange={(e) => setIncluirTextoColoc(e.target.checked)}
                    />{" "}
                    Incluir texto de colocación
                  </label>
                  <label className="pn-check-row">
                    <input
                      type="checkbox"
                      checked={agregarIVA}
                      onChange={(e) => setAgregarIVA(e.target.checked)}
                    />{" "}
                    Agregar IVA al precio de cada módulo
                  </label>
                </div>
              </div>

              {/* Leyenda */}
              <div className="pn-section-label">Leyenda:</div>
              <textarea
                className="pn-textarea"
                rows={2}
                value={leyenda}
                onChange={(e) => setLeyenda(e.target.value)}
              />

              {/* Observaciones */}
              <div className="pn-section-label" style={{ marginTop: 14 }}>
                Observaciones:
              </div>
              <textarea
                className="pn-textarea"
                rows={10}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </>
          )}

          {tab === "cocina" && (
            <TabCocina
              cocinaItems={cocinaItems}
              setCocinaItems={setCocinaItems}
              cocinaFamilia={cocinaFamilia}
              setCocinaFamilia={setCocinaFamilia}
              lineasActivas={lineasActivas}
              listaPorcentaje={listaPorcentaje}
              aplicarPorcentaje={aplicarPorcentaje}
              authFetch={authFetch}
              onVerPresupuesto={() => setTab("presupuesto")}
              abrirPrecioPopover={abrirPrecioPopover}
            />
          )}
          {tab === "placard" && !placardFamilia && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6699bb",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Seleccionar familia
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  {
                    key: "placard",
                    icon: "🚪",
                    label: "Placard",
                    count: placardItems.placard?.length ?? 0,
                  },
                  {
                    key: "frente",
                    icon: "🪟",
                    label: "Frente",
                    count: placardItems.frente?.length ?? 0,
                  },
                  {
                    key: "auxiliares",
                    icon: "🗂️",
                    label: "Auxiliares",
                    count: placardItems.auxiliares?.length ?? 0,
                  },
                  {
                    key: "accesorios",
                    icon: "🔧",
                    label: "Accesorios",
                    count: placardItems.accesorios?.length ?? 0,
                  },
                ].map(({ key, icon, label, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPlacardFamilia(key);
                      setPlacardEditIdx(null);
                      setPlacardFila({
                        articulo: "",
                        cantidad: 1,
                        precio: "",
                        precios: [],
                      });
                      setPlacardSearch("");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "28px 40px",
                      background: "#fff",
                      border: "1px solid #b8cfe0",
                      borderRadius: 4,
                      fontFamily: "'Space Mono', monospace",
                      cursor: "pointer",
                      minWidth: 160,
                      transition: "all 0.12s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#ddeefa";
                      e.currentTarget.style.borderColor = "#4a90c8";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.borderColor = "#b8cfe0";
                    }}
                  >
                    <span style={{ fontSize: 36 }}>{icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0a3a5c",
                      }}
                    >
                      {label}
                    </span>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#4a90c8",
                          background: "#e0f0fc",
                          borderRadius: 10,
                          padding: "2px 10px",
                        }}
                      >
                        {count} artículo{count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {(placardItems.placard?.length > 0 ||
                placardItems.frente?.length > 0 ||
                placardItems.auxiliares?.length > 0 ||
                placardItems.accesorios?.length > 0) && (
                <div
                  style={{
                    marginTop: 24,
                    fontSize: 12,
                    color: "#0a3a5c",
                    borderTop: "1px solid #dde6ef",
                    paddingTop: 16,
                    display: "flex",
                    gap: 32,
                    flexWrap: "wrap",
                  }}
                >
                  {placardItems.placard?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total placard:{" "}
                      <strong>
                        $
                        {placard_total("placard").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                  {placardItems.frente?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total frente:{" "}
                      <strong>
                        $
                        {placard_total("frente").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                  {placardItems.auxiliares?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total auxiliares:{" "}
                      <strong>
                        $
                        {placard_total("auxiliares").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                  {placardItems.accesorios?.length > 0 && (
                    <span style={{ color: "#0a5c3a" }}>
                      Total accesorios:{" "}
                      <strong>
                        $
                        {placard_total("accesorios").toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "placard" && placardFamilia && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <button
                  onClick={() => {
                    setPlacardFamilia(null);
                    setPlacardEditIdx(null);
                    setPlacardFila({
                      articulo: "",
                      nombreart: "",
                      cantidad: 1,
                      precio: "",
                      precios: [],
                      precioPlacard: "",
                      margen: null,
                      valor1: null,
                      porcentaje1: null,
                      valor2: null,
                      porcentaje2: null,
                      valor3: null,
                      porcentaje3: null,
                    });
                    setPlacardSearch("");
                  }}
                  style={{
                    padding: "4px 14px",
                    background: "#fff",
                    border: "1px solid #b8cfe0",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    color: "#0a3a5c",
                  }}
                >
                  ← Familias
                </button>
                <span
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#0a3a5c",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {placardFamilia === "frente"
                    ? "🪟 Frente"
                    : placardFamilia === "auxiliares"
                      ? "🗂️ Auxiliares"
                      : placardFamilia === "accesorios"
                        ? "🔧 Accesorios"
                        : "🚪 Placard"}
                </span>
                <button
                  onClick={() => setTab("presupuesto")}
                  style={{
                    marginLeft: "auto",
                    padding: "5px 16px",
                    background: "#0a5c3a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 2,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title="Ver presupuesto completo"
                >
                  📋 Ver Presupuesto
                </button>
              </div>

              {placardItems[placardFamilia]?.length > 0 && (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: 20,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#e8f0f7", color: "#0a3a5c" }}>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                        }}
                      >
                        Producto
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                        }}
                      >
                        Artículo
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 80,
                        }}
                      >
                        Cant.
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 110,
                        }}
                      >
                        Placard
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 130,
                        }}
                      >
                        Precio unit.
                      </th>
                      <th
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          border: "1px solid #c8dae8",
                          fontWeight: 700,
                          width: 130,
                        }}
                      >
                        Subtotal
                      </th>
                      <th
                        style={{
                          padding: "8px 6px",
                          border: "1px solid #c8dae8",
                          width: 70,
                        }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {placardItems[placardFamilia].map((fila, idx) =>
                      placardEditIdx === idx ? (
                        <tr key={idx} style={{ background: "#fffbe6" }}>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              value={placardFila.nombreart ?? ""}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  nombreart: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                              position: "relative",
                            }}
                          >
                            <input
                              value={placardSearch}
                              onChange={(e) => {
                                setPlacardSearch(e.target.value);
                                setPlacardFila((f) => ({
                                  ...f,
                                  articulo: e.target.value,
                                  precio: "",
                                }));
                              }}
                              onFocus={() => setPlacardSearchFocus(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setPlacardSearchFocus(false),
                                  150,
                                )
                              }
                              style={{
                                width: "100%",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                            {placardSearchFocus &&
                              productosFiltrados.length > 0 && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "#fff",
                                    border: "1px solid #b8cfe0",
                                    zIndex: 50,
                                    boxShadow: "0 4px 12px #0002",
                                    minWidth: 480,
                                    maxHeight: 200,
                                    overflowY: "auto",
                                  }}
                                >
                                  {productosFiltrados.map((p, pi) => {
                                    const base = p.articulo;
                                    return (
                                      <div
                                        key={pi}
                                        onClick={() => {
                                          const { preciosBase, precioBaseUsar } =
                                            resolverPrecioBasePlacard(p);
                                          const precios = preciosBase.map(
                                            (pb) => ({
                                              linea: pb.linea,
                                              precioBase: pb.precioBase,
                                              precio: aplicarPorcentaje(
                                                pb.precioBase,
                                              ),
                                            }),
                                          );
                                          const precioPlacard =
                                            p.precio_un ?? p.PRECIO_UN ?? "";
                                          const precioUsarLineas =
                                            precios[0]?.precio &&
                                            precios[0].precio !== ""
                                              ? precios[0].precio
                                              : aplicarPorcentaje(
                                                  precioBaseUsar,
                                                );
                                          const precioUsar =
                                            precioUsarLineas &&
                                            precioUsarLineas !== ""
                                              ? precioUsarLineas
                                              : precioPlacard || "";
                                          const nombreart =
                                            p.nombreart ?? p.NOMBREART ?? base;
                                          setPlacardFila((f) => ({
                                            ...f,
                                            articulo: base,
                                            nombreart,
                                            precio: String(precioUsar),
                                            precioBase: String(precioBaseUsar),
                                            precioPlacard:
                                              String(precioPlacard),
                                            precios,
                                            preciosBase,
                                          }));
                                          setPlacardSearch(base);
                                        }}
                                        style={{
                                          padding: "7px 12px",
                                          cursor: "pointer",
                                          fontSize: 12,
                                          borderBottom: "1px solid #eef2f6",
                                        }}
                                        onMouseOver={(e) =>
                                          (e.currentTarget.style.background =
                                            "#ddeefa")
                                        }
                                        onMouseOut={(e) =>
                                          (e.currentTarget.style.background =
                                            "#fff")
                                        }
                                      >
                                        <span
                                          style={{
                                            color: "#0a3a5c",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {base}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              type="number"
                              min="1"
                              value={placardFila.cantidad}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  cantidad: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                textAlign: "center",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 4px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              value={placardFila.precioPlacard ?? ""}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  precioPlacard: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                textAlign: "right",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              value={placardFila.precio}
                              onChange={(e) =>
                                setPlacardFila((f) => ({
                                  ...f,
                                  precio: e.target.value,
                                }))
                              }
                              style={{
                                width: "100%",
                                textAlign: "right",
                                fontFamily: "'Space Mono',monospace",
                                fontSize: 12,
                                border: "1px solid #7aaac8",
                                padding: "4px 8px",
                                borderRadius: 2,
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                              color: "#0a5c3a",
                              fontWeight: 700,
                            }}
                          >
                            $
                            {(
                              (parseFloat(placardFila.precio) || 0) *
                              (parseFloat(placardFila.cantidad) || 0)
                            ).toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            style={{
                              padding: "6px 4px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => placardGuardarEdit(idx)}
                              style={{
                                background: "#0a5c3a",
                                color: "#fff",
                                border: "none",
                                borderRadius: 2,
                                padding: "3px 8px",
                                cursor: "pointer",
                                fontSize: 13,
                                marginRight: 2,
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setPlacardEditIdx(null);
                                setPlacardFila({
                                  articulo: "",
                                  nombreart: "",
                                  cantidad: 1,
                                  precio: "",
                                  precios: [],
                                  precioPlacard: "",
                                  margen: null,
                                  valor1: null,
                                  porcentaje1: null,
                                  valor2: null,
                                  porcentaje2: null,
                                  valor3: null,
                                  porcentaje3: null,
                                });
                                setPlacardSearch("");
                              }}
                              style={{
                                background: "#c0392b",
                                color: "#fff",
                                border: "none",
                                borderRadius: 2,
                                padding: "3px 8px",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 0 ? "#fff" : "#f5f9fc",
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              color: "#334155",
                              fontSize: 11,
                            }}
                          >
                            {fila.nombreart}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                            }}
                          >
                            {fila.articulo}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            {fila.cantidad}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                            }}
                          >
                            $
                            {Number(fila.precioPlacard ?? 0).toLocaleString(
                              "es-AR",
                              { minimumFractionDigits: 2 },
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                            }}
                          >
                            <span
                              className="pn-precio-cell"
                              onClick={(e) =>
                                abrirPrecioPopover(
                                  "placard",
                                  placardFamilia,
                                  idx,
                                  "precio",
                                  parseFloat(fila.precio) || 0,
                                  e,
                                )
                              }
                            >
                              $
                              {Number(fila.precio).toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            {listaPorcentaje !== 0 && (
                              <span
                                style={{
                                  marginLeft: 5,
                                  fontSize: 9,
                                  color: "#2277bb",
                                  fontWeight: 700,
                                  verticalAlign: "middle",
                                }}
                              >
                                +{listaPorcentaje}%
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #c8dae8",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            $
                            {(
                              (parseFloat(fila.precio) || 0) *
                              (parseFloat(fila.cantidad) || 0)
                            ).toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            style={{
                              padding: "8px 4px",
                              border: "1px solid #c8dae8",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => placardIniciarEdit(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 15,
                                marginRight: 4,
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => placardEliminarFila(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 15,
                              }}
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                    <tr style={{ background: "#e8f4ee" }}>
                      <td
                        colSpan={5}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #c8dae8",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0a3a5c",
                        }}
                      >
                        Total Placard
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #c8dae8",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#0a5c3a",
                        }}
                      >
                        $
                        {placard_total(placardFamilia).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ border: "1px solid #c8dae8" }}></td>
                    </tr>
                  </tbody>
                </table>
              )}

              {placardEditIdx === null && (
                <div
                  style={{
                    background: "#f5f9fc",
                    border: "1px solid #c8dae8",
                    borderRadius: 3,
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6699bb",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Agregar artículo
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ position: "relative", flex: "2 1 220px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Artículo
                      </label>
                      <input
                        value={placardSearch}
                        onChange={(e) => {
                          setPlacardSearch(e.target.value);
                          setPlacardFila((f) => ({
                            ...f,
                            articulo: e.target.value,
                            precio: "",
                          }));
                        }}
                        onFocus={() => setPlacardSearchFocus(true)}
                        onBlur={() =>
                          setTimeout(() => setPlacardSearchFocus(false), 150)
                        }
                        placeholder="Buscar en BD..."
                        style={{
                          width: "100%",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                      {placardSearchFocus && productosFiltrados.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #b8cfe0",
                            zIndex: 50,
                            boxShadow: "0 4px 12px #0002",
                            maxHeight: 200,
                            overflowY: "auto",
                          }}
                        >
                          {productosFiltrados.map((p, pi) => {
                            const base = p.articulo;
                            return (
                              <div
                                key={pi}
                                onClick={() => {
                                  const { preciosBase, precioBaseUsar } =
                                    resolverPrecioBasePlacard(p);
                                  const precios = preciosBase.map((pb) => ({
                                    linea: pb.linea,
                                    precioBase: pb.precioBase,
                                    precio: aplicarPorcentaje(pb.precioBase),
                                  }));
                                  const precioPlacard =
                                    p.precio_un ?? p.PRECIO_UN ?? "";
                                  const precioUsarLineas =
                                    precios[0]?.precio &&
                                    precios[0].precio !== ""
                                      ? precios[0].precio
                                      : aplicarPorcentaje(precioBaseUsar);
                                  const precioUsar =
                                    precioUsarLineas && precioUsarLineas !== ""
                                      ? precioUsarLineas
                                      : precioPlacard || "";
                                  const nombreart =
                                    p.nombreart ?? p.NOMBREART ?? base;
                                  setPlacardFila((f) => ({
                                    ...f,
                                    articulo: base,
                                    nombreart,
                                    precio: String(precioUsar),
                                    precioBase: String(precioBaseUsar),
                                    precioPlacard: String(precioPlacard),
                                    precios,
                                    preciosBase,
                                  }));
                                  setPlacardSearch(base);
                                }}
                                style={{
                                  padding: "8px 14px",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  borderBottom: "1px solid #eef2f6",
                                }}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.background = "#ddeefa")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.background = "#fff")
                                }
                              >
                                <span
                                  style={{ color: "#0a3a5c", fontWeight: 600 }}
                                >
                                  {base}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Producto (nombreart) — editable, pre-rellena con articulo */}
                    <div style={{ flex: "2 1 200px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Producto
                      </label>
                      <input
                        value={placardFila.nombreart ?? ""}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            nombreart: e.target.value,
                          }))
                        }
                        placeholder="Nombre en presupuesto..."
                        style={{
                          width: "100%",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <div style={{ flex: "0 0 80px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={placardFila.cantidad}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            cantidad: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          textAlign: "center",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 6px",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    {/* Columna fija "Placard" — siempre visible, precio_un del artículo */}
                    <div style={{ flex: "1 1 120px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "#6699bb",
                          marginBottom: 4,
                        }}
                      >
                        Placard
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={placardFila.precioPlacard ?? ""}
                        onChange={(e) =>
                          setPlacardFila((f) => ({
                            ...f,
                            precioPlacard: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        style={{
                          width: "100%",
                          textAlign: "right",
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          border: "1px solid #b8cfe0",
                          padding: "6px 10px",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    {lineasActivas.length > 0 ? (
                      lineasActivas.map((l, li) => (
                        <div key={li} style={{ flex: "1 1 120px" }}>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              color: "#6699bb",
                              marginBottom: 4,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            Línea {l.linea}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={placardFila.precios[li]?.precio ?? ""}
                            onChange={(e) =>
                              setPlacardFila((f) => {
                                const precios = [
                                  ...(f.precios.length
                                    ? f.precios
                                    : lineasActivas.map((la) => ({
                                        linea: la.linea,
                                        precio: "",
                                      }))),
                                ];
                                precios[li] = {
                                  ...precios[li],
                                  precio: e.target.value,
                                };
                                return {
                                  ...f,
                                  precio: precios[0]?.precio ?? "",
                                  precios,
                                };
                              })
                            }
                            placeholder="0.00"
                            style={{
                              width: "100%",
                              textAlign: "right",
                              fontFamily: "'Space Mono',monospace",
                              fontSize: 12,
                              border: "1px solid #b8cfe0",
                              padding: "6px 10px",
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div style={{ flex: "1 1 130px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "#6699bb",
                            marginBottom: 4,
                          }}
                        >
                          Precio unit.
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={placardFila.precio}
                          onChange={(e) =>
                            setPlacardFila((f) => ({
                              ...f,
                              precio: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          style={{
                            width: "100%",
                            textAlign: "right",
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 12,
                            border: "1px solid #b8cfe0",
                            padding: "6px 10px",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    )}
                    <div style={{ flex: "0 0 auto", paddingTop: 20 }}>
                      <button
                        onClick={placardAgregarFila}
                        disabled={!placardFila.articulo.trim()}
                        style={{
                          padding: "6px 20px",
                          background: placardFila.articulo.trim()
                            ? "#0a3a5c"
                            : "#c8dae8",
                          color: "#fff",
                          border: "none",
                          borderRadius: 2,
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          cursor: placardFila.articulo.trim()
                            ? "pointer"
                            : "default",
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "mampara" && (
            <TabMampara
              cliente={cliente}
              codcliente={codcliente}
              telefono1={telefono1}
              wapp={wapp}
              numeroPres={numeroPres}
              mamparaAEditar={mamparaAEditar}
              setPresmv={setPresmv}
              setPresupuestoItems={setPresupuestoItems}
            />
          )}

          {tab === "especiales" && (
            <TabEspeciales
              token={token}
              numeroPres={numeroPres}
              cliente={cliente}
              codcliente={codcliente}
              revision={revision}
              tiposVanitory={tiposVanitory}
              tiposVanitoryRUD={tiposVanitoryRUD}
              tiposDespensero={tiposDespensero}
              tiposDespenseroRUD={tiposDespenseroRUD}
              onVerTabla={onVerTabla}
              agregarAPresupuesto={agregarAPresupuesto}
            />
          )}

          {tab === "presupuesto" && (
            <div>
              {/* Encabezado cliente */}
              <div
                style={{
                  background: "#e8f0f7",
                  border: "1px solid #c8dae8",
                  borderRadius: 3,
                  padding: "10px 16px",
                  marginBottom: 20,
                  fontFamily: "'Space Mono',monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#6699bb",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Cliente:
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#0a3a5c" }}
                >
                  {cliente || "Consumidor final"}
                </span>
                {telefono1 && (
                  <span style={{ fontSize: 11, color: "#4a6a8c" }}>
                    📞 {telefono1}
                  </span>
                )}
                {telefono2 && (
                  <span style={{ fontSize: 11, color: "#4a6a8c" }}>
                    📞 {telefono2}
                  </span>
                )}
                {wapp && (
                  <span style={{ fontSize: 11, color: "#1a7a3a" }}>
                    💬 {wapp}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: "#0a3a5c",
                    background: "#eaf2fa",
                    border: "1px solid #c8dae8",
                    borderRadius: 2,
                    padding: "2px 8px",
                    fontWeight: 700,
                  }}
                >
                  Lista vigente: {listaPrecio || "—"}
                </span>
                <span
                  style={{ marginLeft: "auto", fontSize: 11, color: "#6699bb" }}
                >
                  N° {numero} — Rev. {revision}
                </span>
              </div>

              {/* ── Panel de ajuste de precios ── */}
              {presupuestoItems.length > 0 && (
                <div
                  style={{
                    background: "#f5f8fb",
                    border: "1px solid #c8dae8",
                    borderRadius: 4,
                    padding: "12px 16px",
                    marginBottom: 16,
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Etiqueta */}
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#0a3a5c",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✏️ Ajuste de precios
                    </span>

                    {/* Modo */}
                    <div
                      style={{
                        display: "flex",
                        border: "1px solid #b8cfe0",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      {[
                        ["porcentaje", "% Porcentaje"],
                        ["monto", "$ Monto"],
                      ].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => {
                            setAjusteModo(val);
                            setAjusteValor("");
                          }}
                          style={{
                            padding: "5px 12px",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: "'Space Mono',monospace",
                            fontSize: 11,
                            background: ajusteModo === val ? "#0a3a5c" : "#fff",
                            color: ajusteModo === val ? "#fff" : "#0a3a5c",
                            borderRight:
                              val === "porcentaje"
                                ? "1px solid #b8cfe0"
                                : "none",
                            transition: "all 0.12s",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Valor */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span style={{ color: "#6699bb", fontSize: 13 }}>
                        {ajusteModo === "porcentaje" ? "%" : "$"}
                      </span>
                      <input
                        type="number"
                        value={ajusteValor}
                        onChange={(e) => setAjusteValor(e.target.value)}
                        placeholder={
                          ajusteModo === "porcentaje" ? "ej: 10" : "ej: 500"
                        }
                        style={{
                          width: 90,
                          padding: "5px 8px",
                          border: "1px solid #b8cfe0",
                          borderRadius: 2,
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 12,
                          outline: "none",
                          color: "#0a3a5c",
                        }}
                        onKeyDown={(e) => e.key === "Enter" && aplicarAjuste()}
                      />
                    </div>

                    {/* Scope */}
                    <select
                      value={ajusteScope}
                      onChange={(e) => setAjusteScope(e.target.value)}
                      style={{
                        padding: "5px 8px",
                        border: "1px solid #b8cfe0",
                        borderRadius: 2,
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 11,
                        color: "#0a3a5c",
                        background: "#fff",
                        maxWidth: 200,
                      }}
                    >
                      <option value="todos">Todos los ítems</option>
                      {presupuestoItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.descripcion || it.nombreart || it.id}
                        </option>
                      ))}
                    </select>

                    {/* Botón aplicar */}
                    <button
                      onClick={aplicarAjuste}
                      disabled={!ajusteValor}
                      style={{
                        padding: "5px 14px",
                        background: ajusteValor ? "#0a3a5c" : "#c8dae8",
                        color: ajusteValor ? "#fff" : "#99aabb",
                        border: "none",
                        borderRadius: 2,
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 11,
                        cursor: ajusteValor ? "pointer" : "default",
                        fontWeight: 700,
                        transition: "all 0.12s",
                      }}
                    >
                      Aplicar
                    </button>

                    {/* Botón revertir */}
                    {ajusteAplicado && (
                      <button
                        onClick={() => {
                          if (Object.keys(preciosOriginales).length === 0) {
                            alert(
                              "Este ajuste viene de un presupuesto ya guardado: no se puede revertir automáticamente (los precios base no quedaron en memoria). Para deshacerlo, aplicá un ajuste manual inverso.",
                            );
                            return;
                          }
                          revertirAjuste();
                        }}
                        style={{
                          padding: "5px 14px",
                          background: "#fff",
                          color: "#c0392b",
                          border: "1px solid #e0b0b0",
                          borderRadius: 2,
                          fontFamily: "'Space Mono',monospace",
                          fontSize: 11,
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        ↩ Revertir
                      </button>
                    )}

                    {/* Indicador activo */}
                    {ajusteAplicado && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#1a7a3a",
                          background: "#e8f4ee",
                          border: "1px solid #b0d8bc",
                          borderRadius: 2,
                          padding: "2px 8px",
                          fontWeight: 700,
                        }}
                      >
                        AJUSTE ACTIVO: {ajusteValor}
                        {ajusteModo === "porcentaje" ? "%" : "$"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {presupuestoItems.length === 0 ? (
                <div className="pn-modulos-empty">
                  <span style={{ fontSize: 36 }}>📋</span>
                  <span style={{ fontSize: 13, color: "#6699bb" }}>
                    Aún no hay ítems cargados
                  </span>
                  <span style={{ fontSize: 11, color: "#99bbcc" }}>
                    Cargá artículos en Cocina, Placard, Mampara o Especiales
                  </span>
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: "'Space Mono',monospace",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#0a3a5c", color: "#fff" }}>
                      <th
                        style={{
                          padding: "9px 14px",
                          textAlign: "left",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        Sección
                      </th>
                      <th
                        style={{
                          padding: "9px 14px",
                          textAlign: "left",
                          fontWeight: 700,
                        }}
                      >
                        Producto
                      </th>
                      <th
                        style={{
                          padding: "9px 14px",
                          textAlign: "left",
                          fontWeight: 700,
                        }}
                      >
                        Descripción
                      </th>
                      <th
                        style={{
                          padding: "9px 10px",
                          textAlign: "center",
                          fontWeight: 700,
                          width: 70,
                        }}
                      >
                        Cant.
                      </th>
                      <th
                        style={{
                          padding: "9px 10px",
                          textAlign: "center",
                          fontWeight: 700,
                          width: 70,
                        }}
                      >
                        Ancho
                      </th>
                      <th
                        style={{
                          padding: "9px 10px",
                          textAlign: "center",
                          fontWeight: 700,
                          width: 70,
                        }}
                      >
                        Alto
                      </th>
                      {lineasActivas.length > 0 ? (
                        lineasActivas.map((l) => (
                          <th
                            key={l.linea}
                            style={{
                              padding: "9px 14px",
                              textAlign: "right",
                              fontWeight: 700,
                              width: 130,
                            }}
                          >
                            Línea {l.linea}
                          </th>
                        ))
                      ) : (
                        <th
                          style={{
                            padding: "9px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            width: 130,
                          }}
                        >
                          Precio unit.
                        </th>
                      )}
                      <th
                        style={{
                          padding: "9px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          width: 140,
                        }}
                      >
                        Subtotal
                      </th>
                      <th style={{ padding: "9px 8px", width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const secciones = [
                        ...new Set(presupuestoItems.map((p) => p.seccion)),
                      ];
                      let rowIdx = 0;
                      return secciones.flatMap((sec) => {
                        const items = presupuestoItems.filter(
                          (p) => p.seccion === sec,
                        );
                        // Subtotal por línea para la sección
                        const subtotalesSec =
                          lineasActivas.length > 0
                            ? lineasActivas.map((l, li) =>
                                items.reduce((s, it) => {
                                  const pr =
                                    parseFloat(
                                      it.precios?.[li]?.precio ??
                                        it.precio ??
                                        0,
                                    ) || 0;
                                  return (
                                    s + pr * (parseFloat(it.cantidad) || 1)
                                  );
                                }, 0),
                              )
                            : null;
                        const subtotalSecSimple = items.reduce(
                          (s, it) => s + it.subtotal,
                          0,
                        );
                        const totalCols =
                          6 +
                          (lineasActivas.length > 0
                            ? lineasActivas.length
                            : 1) +
                          1; // sección+prod+desc+cant+ancho+alto + líneas + subtotal

                        return [
                          // Fila de sección
                          <tr
                            key={`sec-${sec}`}
                            style={{ background: "#ddeefa" }}
                          >
                            <td
                              colSpan={totalCols + 1}
                              style={{
                                padding: "6px 14px",
                                fontWeight: 700,
                                color: "#0a3a5c",
                                fontSize: 11,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                              }}
                            >
                              {sec}
                            </td>
                          </tr>,
                          // Filas de ítems
                          ...items.map((item) => {
                            const bg = rowIdx++ % 2 === 0 ? "#fff" : "#f5f9fc";
                            return (
                              <tr key={item.id} style={{ background: bg }}>
                                <td
                                  style={{
                                    padding: "7px 14px",
                                    border: "1px solid #e8f0f7",
                                    color: "#6699bb",
                                    fontSize: 11,
                                  }}
                                ></td>
                                <td
                                  style={{
                                    padding: "7px 14px",
                                    border: "1px solid #e8f0f7",
                                    color: "#334155",
                                    fontSize: 11,
                                  }}
                                >
                                  {item.nombreart}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 14px",
                                    border: "1px solid #e8f0f7",
                                    color: "#0a3a5c",
                                  }}
                                >
                                  {item.descripcion}
                                  {item.seccion === "Mampara" && (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        fontSize: 10,
                                        color:
                                          presmv != null
                                            ? "#2277bb"
                                            : "#c0392b",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      presmv: {presmv ?? "null"}
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 10px",
                                    border: "1px solid #e8f0f7",
                                    textAlign: "center",
                                  }}
                                >
                                  {item.cantidad}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 10px",
                                    border: "1px solid #e8f0f7",
                                    textAlign: "center",
                                    color:
                                      item.seccion === "Mampara"
                                        ? "#0a3a5c"
                                        : "#aaa",
                                  }}
                                >
                                  {item.seccion === "Mampara"
                                    ? (item.ancho ?? "—")
                                    : "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 10px",
                                    border: "1px solid #e8f0f7",
                                    textAlign: "center",
                                    color:
                                      item.seccion === "Mampara"
                                        ? "#0a3a5c"
                                        : "#aaa",
                                  }}
                                >
                                  {item.seccion === "Mampara"
                                    ? (item.alto ?? "—")
                                    : "—"}
                                </td>
                                {lineasActivas.length > 0 ? (
                                  lineasActivas.map((l, li) => {
                                    const pr =
                                      item.precios?.[li]?.precio ??
                                      item.precio ??
                                      0;
                                    return (
                                      <td
                                        key={l.linea}
                                        style={{
                                          padding: "7px 14px",
                                          border: "1px solid #e8f0f7",
                                          textAlign: "right",
                                        }}
                                      >
                                        <span
                                          className="pn-precio-cell"
                                          onClick={(e) =>
                                            abrirPresItemPopover(
                                              item.id,
                                              li,
                                              parseFloat(pr) || 0,
                                              e,
                                            )
                                          }
                                        >
                                          $
                                          {Number(pr).toLocaleString("es-AR", {
                                            minimumFractionDigits: 2,
                                          })}
                                        </span>
                                        {item.porcentaje1 != null ? (
                                          <span
                                            style={{
                                              marginLeft: 5,
                                              fontSize: 9,
                                              fontWeight: 700,
                                            }}
                                          >
                                            {listaPorcentaje !== 0 && (
                                              <span
                                                style={{
                                                  color: "#2277bb",
                                                  marginRight: 2,
                                                }}
                                              >
                                                +{listaPorcentaje}%
                                              </span>
                                            )}
                                            <span
                                              style={{
                                                color:
                                                  item.porcentaje1 >= 0
                                                    ? "#0a7a3a"
                                                    : "#c0392b",
                                                background:
                                                  item.porcentaje1 >= 0
                                                    ? "#e6f5eb"
                                                    : "#fdecea",
                                                borderRadius: 3,
                                                padding: "1px 4px",
                                              }}
                                            >
                                              {item.porcentaje1 > 0 ? "+" : ""}
                                              {item.porcentaje1}%
                                            </span>
                                          </span>
                                        ) : (
                                          listaPorcentaje !== 0 && (
                                            <span
                                              style={{
                                                marginLeft: 5,
                                                fontSize: 9,
                                                color: "#2277bb",
                                                fontWeight: 700,
                                              }}
                                            >
                                              +{listaPorcentaje}%
                                            </span>
                                          )
                                        )}
                                      </td>
                                    );
                                  })
                                ) : (
                                  <td
                                    style={{
                                      padding: "7px 14px",
                                      border: "1px solid #e8f0f7",
                                      textAlign: "right",
                                    }}
                                  >
                                    <span
                                      className="pn-precio-cell"
                                      onClick={(e) =>
                                        abrirPresItemPopover(
                                          item.id,
                                          null,
                                          parseFloat(item.precio) || 0,
                                          e,
                                        )
                                      }
                                    >
                                      $
                                      {Number(item.precio).toLocaleString(
                                        "es-AR",
                                        { minimumFractionDigits: 2 },
                                      )}
                                    </span>
                                    {item.porcentaje1 != null ? (
                                      <span
                                        style={{
                                          marginLeft: 5,
                                          fontSize: 9,
                                          fontWeight: 700,
                                        }}
                                      >
                                        {listaPorcentaje !== 0 && (
                                          <span
                                            style={{
                                              color: "#2277bb",
                                              marginRight: 2,
                                            }}
                                          >
                                            +{listaPorcentaje}%
                                          </span>
                                        )}
                                        <span
                                          style={{
                                            color:
                                              item.porcentaje1 >= 0
                                                ? "#0a7a3a"
                                                : "#c0392b",
                                            background:
                                              item.porcentaje1 >= 0
                                                ? "#e6f5eb"
                                                : "#fdecea",
                                            borderRadius: 3,
                                            padding: "1px 4px",
                                          }}
                                        >
                                          {item.porcentaje1 > 0 ? "+" : ""}
                                          {item.porcentaje1}%
                                        </span>
                                      </span>
                                    ) : (
                                      listaPorcentaje !== 0 && (
                                        <span
                                          style={{
                                            marginLeft: 5,
                                            fontSize: 9,
                                            color: "#2277bb",
                                            fontWeight: 700,
                                          }}
                                        >
                                          +{listaPorcentaje}%
                                        </span>
                                      )
                                    )}
                                  </td>
                                )}
                                <td
                                  style={{
                                    padding: "7px 14px",
                                    border: "1px solid #e8f0f7",
                                    textAlign: "right",
                                    fontWeight: 700,
                                  }}
                                >
                                  $
                                  {Number(item.subtotal).toLocaleString(
                                    "es-AR",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "7px 4px",
                                    border: "1px solid #e8f0f7",
                                    textAlign: "center",
                                  }}
                                >
                                  {item.seccion === "Mampara" &&
                                    presmv != null && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await authFetch(
                                              `${API}/presupuestos-mamparas/${presmv}`,
                                            );
                                            const data = await res.json();
                                            setMamparaAEditar(data);
                                            setTab("mampara");
                                          } catch {
                                            alert(
                                              "No se pudo cargar la mampara",
                                            );
                                          }
                                        }}
                                        title="Editar mampara"
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          fontSize: 14,
                                          color: "#2277bb",
                                          marginRight: 4,
                                        }}
                                      >
                                        ✏️
                                      </button>
                                    )}
                                  <button
                                    onClick={() => quitarDePresupuesto(item.id)}
                                    title="Quitar"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: 14,
                                      color: "#c0392b",
                                    }}
                                  >
                                    🗑
                                  </button>
                                </td>
                              </tr>
                            );
                          }),
                          // Subtotal de sección
                          <tr
                            key={`sub-${sec}`}
                            style={{ background: "#e8f4ee" }}
                          >
                            <td
                              colSpan={6}
                              style={{
                                padding: "6px 14px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "#0a3a5c",
                                fontSize: 11,
                                border: "1px solid #c8dae8",
                              }}
                            >
                              Subtotal {sec}
                            </td>
                            {lineasActivas.length > 0
                              ? subtotalesSec.map((st, li) => (
                                  <td
                                    key={li}
                                    style={{
                                      padding: "6px 14px",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      color: "#0a5c3a",
                                      border: "1px solid #c8dae8",
                                    }}
                                  >
                                    $
                                    {st.toLocaleString("es-AR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                ))
                              : null}
                            <td
                              style={{
                                padding: "6px 14px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "#0a5c3a",
                                border: "1px solid #c8dae8",
                              }}
                            >
                              $
                              {subtotalSecSimple.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td style={{ border: "1px solid #c8dae8" }}></td>
                          </tr>,
                        ];
                      });
                    })()}
                    {/* TOTAL GENERAL */}
                    <tr style={{ background: "#0a3a5c" }}>
                      <td
                        colSpan={6}
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#60efff",
                          fontSize: 13,
                          letterSpacing: "0.06em",
                        }}
                      >
                        TOTAL GENERAL
                      </td>
                      {lineasActivas.length > 0
                        ? lineasActivas.map((l, li) => {
                            const total = presupuestoItems.reduce((s, it) => {
                              const pr =
                                parseFloat(
                                  it.precios?.[li]?.precio ?? it.precio ?? 0,
                                ) || 0;
                              return s + pr * (parseFloat(it.cantidad) || 1);
                            }, 0);
                            return (
                              <td
                                key={l.linea}
                                style={{
                                  padding: "10px 14px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: "#fff",
                                  fontSize: 14,
                                }}
                              >
                                $
                                {total.toLocaleString("es-AR", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            );
                          })
                        : null}
                      <td
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: lineasActivas.length > 0 ? "#60efff" : "#fff",
                          fontSize: 14,
                        }}
                      >
                        $
                        {presupuestoItems
                          .reduce((s, p) => s + p.subtotal, 0)
                          .toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                      </td>
                      <td style={{ background: "#0a3a5c" }}></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
