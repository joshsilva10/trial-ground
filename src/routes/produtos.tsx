import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, FileImage, FileText, PackagePlus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState, Field, Panel, btnOutline, btnPrimary, inputClass } from "@/components/Ui";
import { Button } from "@/components/ui/button";
import { frameLooksLikeDocument, readInvoice, type InvoiceLine } from "@/lib/invoice-ocr";
import { PERMISSOES, formatDataHora, useApp } from "@/lib/store";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e estoque | Sistema Administrativo" },
      {
        name: "description",
        content: "Cadastre produtos, acompanhe saldos e registre entradas por captura de nota fiscal.",
      },
      { property: "og:title", content: "Produtos e estoque | Sistema Administrativo" },
      { property: "og:description", content: "Cadastro de produtos, saldos e entradas de estoque." },
    ],
  }),
  component: ProdutosPage,
});

type LinhaOcr = InvoiceLine;

const PAGINA = 8;

function ProdutosPage() {
  const { products, movements, addProduct, registerEntry } = useApp();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aba, setAba] = useState<"manual" | "ocr">("manual");

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [quantidade, setQuantidade] = useState("0");
  const [minimo, setMinimo] = useState("0");

  const [arquivo, setArquivo] = useState<string>("");
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erroLeitura, setErroLeitura] = useState("");
  const [numeroNota, setNumeroNota] = useState("");
  const [textoLido, setTextoLido] = useState("");
  const [linhas, setLinhas] = useState<LinhaOcr[]>([]);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [capturaAutomatica, setCapturaAutomatica] = useState(true);
  const capturaAutomaticaRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return products.filter(
      (p) =>
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.codigo.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo),
    );
  }, [products, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * PAGINA, paginaAtual * PAGINA);

  function stopCamera() {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraAtiva(false);
    stableFramesRef.current = 0;
  }

  useEffect(() => () => {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function linkProducts(items: InvoiceLine[]) {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    return items.map((item) => {
      const wanted = normalize(item.nome);
      const found = products.find((product) => {
        const current = normalize(product.nome);
        return current === wanted || current.includes(wanted) || wanted.includes(current);
      });
      return found ? { ...item, produtoId: found.id } : item;
    });
  }

  async function processDocument(file: File | Blob, fileName: string) {
    setProcessando(true);
    setErroLeitura("");
    setProgresso(0);
    setArquivo(fileName);
    setLinhas([]);
    try {
      const result = await readInvoice(file, setProgresso);
      setNumeroNota(result.numero);
      setTextoLido(result.texto);
      setLinhas(linkProducts(result.linhas));
      if (result.linhas.length === 0) {
        setErroLeitura("O texto foi lido, mas nenhum item pôde ser identificado. Confira o conteúdo e adicione os itens manualmente.");
      } else if (!result.numero) {
        setErroLeitura("Os itens foram identificados, mas o número da nota precisa ser informado manualmente.");
      } else {
        toast.success("Leitura concluída. Confira os dados antes de confirmar.");
      }
    } catch (error) {
      setErroLeitura(error instanceof Error ? `Não foi possível ler o documento: ${error.message}` : "Não foi possível ler o documento.");
    } finally {
      setProcessando(false);
    }
  }

  async function captureCamera() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || processando) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    stopCamera();
    await processDocument(blob, `captura-${new Date().toLocaleTimeString("pt-BR").replaceAll(":", "-")}.jpg`);
  }

  async function startCamera() {
    setErroLeitura("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErroLeitura("A câmera não está disponível neste navegador.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraAtiva(true);
      window.setTimeout(() => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play();
        }
      }, 0);
      scanTimerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!capturaAutomaticaRef.current || !video || video.videoWidth === 0) return;
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = Math.round(240 * (video.videoHeight / video.videoWidth));
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        stableFramesRef.current = frameLooksLikeDocument(canvas) ? stableFramesRef.current + 1 : 0;
        if (stableFramesRef.current >= 3) void captureCamera();
      }, 700);
    } catch {
      setErroLeitura("Não foi possível acessar a câmera. Autorize o uso da câmera ou selecione uma imagem.");
      setCameraAtiva(false);
    }
  }

  function resetReading() {
    stopCamera();
    setLinhas([]);
    setArquivo("");
    setNumeroNota("");
    setTextoLido("");
    setErroLeitura("");
    setProgresso(0);
  }

  return (
    <AppLayout
      titulo="Produtos e estoque"
      descricao="Cadastro de produtos, saldos e entradas"
      requer={PERMISSOES["estoque"]}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Estoque atual">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Buscar por nome, código ou categoria"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              aria-label="Buscar produtos"
            />
          </div>

          {visiveis.length === 0 ? (
            <EmptyState title="Nenhum produto encontrado" description="Ajuste a busca ou cadastre um novo produto." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Produto</th>
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Categoria</th>
                    <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                    <th className="py-2 text-right font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visiveis.map((p) => {
                    const situacao =
                      p.quantidade === 0
                        ? { texto: "Ruptura", cor: "text-destructive" }
                        : p.quantidade < p.minimo
                          ? { texto: "Abaixo do mínimo", cor: "text-warning-strong" }
                          : { texto: "Regular", cor: "text-success-strong" };
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3 font-medium text-foreground">{p.nome}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{p.codigo}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{p.categoria}</td>
                        <td className="py-2.5 pr-3 text-right text-foreground">
                          {p.quantidade} {p.unidade}
                        </td>
                        <td className={`py-2.5 text-right font-medium ${situacao.cor}`}>{situacao.texto}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filtrados.length} produto(s) · página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button className={btnOutline} disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>
                Anterior
              </button>
              <button
                className={btnOutline}
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPagina(paginaAtual + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Registrar produto / entrada">
            <div className="mb-4 flex gap-2">
              <button
                className={aba === "manual" ? btnPrimary : btnOutline}
                onClick={() => setAba("manual")}
                type="button"
              >
                <PackagePlus className="size-4" aria-hidden /> Manual
              </button>
              <button
                className={aba === "ocr" ? btnPrimary : btnOutline}
                onClick={() => setAba("ocr")}
                type="button"
              >
                <Camera className="size-4" aria-hidden /> Nota fiscal
              </button>
            </div>

            {aba === "manual" ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addProduct({
                    nome,
                    codigo: codigo || `GEN-${Math.floor(Math.random() * 900 + 100)}`,
                    categoria: categoria || "A classificar",
                    unidade,
                    quantidade: Number(quantidade) || 0,
                    minimo: Number(minimo) || 0,
                  });
                  toast.success("Produto cadastrado");
                  setNome("");
                  setCodigo("");
                  setCategoria("");
                  setQuantidade("0");
                  setMinimo("0");
                }}
              >
                <Field label="Nome do produto">
                  <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Código">
                    <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                  </Field>
                  <Field label="Unidade">
                    <input className={inputClass} value={unidade} onChange={(e) => setUnidade(e.target.value)} />
                  </Field>
                </div>
                <Field label="Categoria">
                  <input className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade inicial">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                    />
                  </Field>
                  <Field label="Estoque mínimo">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={minimo}
                      onChange={(e) => setMinimo(e.target.value)}
                    />
                  </Field>
                </div>
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Cadastrar produto
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info-strong">
                  A leitura acontece somente neste navegador. Confira o número e os itens: a entrada só será registrada após sua confirmação.
                </p>
                {!cameraAtiva ? (
                  <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <Button type="button" onClick={() => void startCamera()} disabled={processando}>
                      <Camera aria-hidden /> Escanear nota
                    </Button>
                    <label className={`${btnOutline} cursor-pointer`}>
                      <FileImage className="size-4" aria-hidden /> Selecionar imagem
                      <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 20 * 1024 * 1024) return setErroLeitura("O arquivo excede o limite de 20 MB.");
                        void processDocument(file, file.name);
                      }} />
                    </label>
                    <label className={`${btnOutline} cursor-pointer`}>
                      <FileText className="size-4" aria-hidden /> Selecionar PDF
                      <input className="sr-only" type="file" accept="application/pdf" onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 20 * 1024 * 1024) return setErroLeitura("O arquivo excede o limite de 20 MB.");
                        void processDocument(file, file.name);
                      }} />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative aspect-[3/4] max-h-[30rem] overflow-hidden rounded-md bg-muted">
                      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" aria-label="Imagem da câmera" />
                      <div className="pointer-events-none absolute inset-[8%] rounded-md border-2 border-primary shadow-[0_0_0_999px_hsl(var(--foreground)/0.28)]" />
                      <p className="absolute inset-x-3 bottom-3 rounded-md bg-background/90 px-3 py-2 text-center text-xs text-foreground">Mantenha a nota inteira, iluminada e estável dentro da moldura.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={capturaAutomatica} onChange={(event) => {
                        capturaAutomaticaRef.current = event.target.checked;
                        setCapturaAutomatica(event.target.checked);
                      }} />
                      Capturar automaticamente quando identificar uma nota
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" onClick={() => void captureCamera()}><Camera aria-hidden /> Capturar agora</Button>
                      <Button type="button" variant="outline" onClick={stopCamera}><X aria-hidden /> Cancelar</Button>
                    </div>
                  </div>
                )}

                {processando ? (
                  <div role="status" className="space-y-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
                    <p className="text-sm text-muted-foreground">Lendo documento… {Math.round(progresso * 100)}%</p>
                  </div>
                ) : null}
                {erroLeitura ? <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-strong">{erroLeitura}</p> : null}

                {arquivo && !processando ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Documento: {arquivo}</p>
                    <Field label="Número da nota fiscal" hint="Confira este campo antes de registrar a entrada.">
                      <input className={inputClass} value={numeroNota} onChange={(event) => setNumeroNota(event.target.value)} placeholder="Ex.: 000123456" />
                    </Field>
                    {linhas.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_5rem_2.25rem] gap-2">
                        <input
                          className={inputClass}
                          value={l.nome}
                          aria-label={`Item ${i + 1}`}
                          onChange={(e) =>
                            setLinhas((prev) => prev.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))
                          }
                        />
                        <input
                          className={inputClass}
                          type="number"
                          min={0}
                          value={l.quantidade}
                          aria-label={`Quantidade do item ${i + 1}`}
                          onChange={(e) =>
                            setLinhas((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, quantidade: Number(e.target.value) } : x)),
                            )
                          }
                        />
                        <Button type="button" variant="ghost" size="icon" aria-label={`Remover item ${i + 1}`} onClick={() => setLinhas((previous) => previous.filter((_, index) => index !== i))}>
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" className="w-full" onClick={() => setLinhas((previous) => [...previous, { nome: "", quantidade: 1 }])}>Adicionar item</Button>
                    {linhas.length === 0 && textoLido ? <details className="text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Ver texto identificado</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3">{textoLido}</pre></details> : null}
                    <button
                      type="button"
                      className={`${btnPrimary} w-full`}
                      disabled={!numeroNota.trim() || linhas.length === 0 || linhas.some((line) => !line.nome.trim() || line.quantidade <= 0)}
                      onClick={() => {
                        registerEntry(linhas, `Nota fiscal nº ${numeroNota.trim()} (${arquivo})`);
                        resetReading();
                        toast.success("Entrada registrada e estoque atualizado");
                      }}
                    >
                      Confirmar entrada no estoque
                    </button>
                    <Button type="button" variant="outline" className="w-full" onClick={resetReading}>Cancelar leitura</Button>
                  </div>
                ) : null}
              </div>
            )}
          </Panel>

          <Panel title="Movimentações recentes">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação nesta sessão.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {movements.slice(0, 6).map((m) => {
                  const prod = products.find((p) => p.id === m.produtoId);
                  return (
                    <li key={m.id} className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{prod?.nome ?? "Produto"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {m.origem} · {formatDataHora(m.data)}
                        </span>
                      </span>
                      <span className={m.tipo === "entrada" ? "text-success-strong" : "text-destructive"}>
                        {m.tipo === "entrada" ? "+" : "-"}
                        {m.quantidade}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppLayout>
  );
}
