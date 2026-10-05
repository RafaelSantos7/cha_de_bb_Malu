import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutGrid,
  Users,
  WalletCards,
  Store,
  Settings,
  Heart,
  Plus,
  Search,
  CalendarDays,
  MapPin,
  Cloud,
  RefreshCw,
  X,
  Trash2,
  Pencil,
  ChevronRight,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const base = {
  event: { id: null, date: "2027-01-09", city: "Guaratinguetá", budget: 0 },
  guests: [],
  expenses: [],
  suppliers: [],
};

export default function App() {
  const [data, setData] = useState(base),
    [page, setPage] = useState("Visão geral"),
    [modal, setModal] = useState(null),
    [edit, setEdit] = useState(null),
    [q, setQ] = useState(""),
    [loading, setLoading] = useState(true),
    [syncError, setSyncError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setSyncError("");
    const [ev, gu, su, ex, pa] = await Promise.all([
      supabase.from("events").select("*").limit(1).maybeSingle(),
      supabase.from("guests").select("*").order("created_at"),
      supabase.from("suppliers").select("*").order("created_at"),
      supabase.from("expenses").select("*").order("created_at"),
      supabase.from("payments").select("*").order("created_at"),
    ]);
    const err = ev.error || gu.error || su.error || ex.error || pa.error;
    if (err) {
      console.error(err);
      setSyncError(err.message);
      setLoading(false);
      return;
    }
    const suppliers = su.data || [];
    const supplierMap = Object.fromEntries(
      suppliers.map((x) => [x.id, x.name]),
    );
    const expenses = (ex.data || []).map((x) => ({
      ...x,
      dueDate: x.due_date || "",
      supplier: supplierMap[x.supplier_id] || "",
      payments: (pa.data || [])
        .filter((p) => p.expense_id === x.id)
        .map((p) => ({
          id: p.id,
          date: p.payment_date || "",
          value: Number(p.value || 0),
          note: p.description || "Pagamento",
        })),
    }));
    setData({
      event: ev.data
        ? {
            id: ev.data.id,
            date: ev.data.event_date || "",
            city: ev.data.city || "",
            budget: Number(ev.data.budget || 0),
          }
        : base.event,
      guests: (gu.data || []).map((x) => ({ ...x, child: !!x.child })),
      suppliers,
      expenses,
    });
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const removeRow = async (kind, id) => {
    const table = kind === "guests" ? "guests" : "suppliers";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return alert("Erro ao excluir: " + error.message);
    await loadData();
  };

  const totalFinal = data.expenses.reduce(
      (a, x) => a + Number(x.final || 0),
      0,
    ),
    totalEstimated = data.expenses.reduce(
      (a, x) => a + Number(x.estimated || 0),
      0,
    );
  const paidFor = (x) =>
      (x.payments || []).reduce((a, p) => a + Number(p.value || 0), 0),
    totalPaid = data.expenses.reduce((a, x) => a + paidFor(x), 0),
    pending = Math.max(0, totalFinal - totalPaid),
    confirmed = data.guests.filter((x) => x.status === "Confirmado").length;
  const nav = [
    ["Visão geral", LayoutGrid],
    ["Convidados", Users],
    ["Gastos", WalletCards],
    ["Fornecedores", Store],
  ];
  const catData = useMemo(() => {
    let m = {};
    data.expenses.forEach(
      (x) =>
        (m[x.category || "Outros"] =
          (m[x.category || "Outros"] || 0) + Number(x.final || 0)),
    );
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [data]);
  const compData = catData.map((c) => ({
    name: c.name,
    Previsto: data.expenses
      .filter((x) => (x.category || "Outros") === c.name)
      .reduce((a, x) => a + Number(x.estimated || 0), 0),
    Realizado: c.value,
  }));
  const open = (type, obj = null) => {
    setEdit(obj);
    setModal(type);
  };
  function Title({ t, d, a, type }) {
    return (
      <div className="title">
        <div>
          <label>ORGANIZAÇÃO DO CHÁ</label>
          <h1>{t}</h1>
          <p>{d}</p>
        </div>
        <button className="primary" onClick={() => open(type)}>
          <Plus /> {a}
        </button>
      </div>
    );
  }
  function M({ t, v, s }) {
    return (
      <div className="metric">
        <p>{t}</p>
        <h2>{v}</h2>
        {s && <small>{s}</small>}
      </div>
    );
  }
  function Dashboard() {
    let pct = data.event.budget
        ? Math.round((totalFinal / data.event.budget) * 100)
        : 0,
      cost = confirmed ? totalFinal / confirmed : 0;
    return (
      <>
        <Title
          t="Visão geral"
          d="Tudo pronto para receber a Maria Luiza."
          a="Novo gasto"
          type="expense"
        />
        <div className="event">
          <span>
            <CalendarDays />
            {data.event.date
              ? new Date(data.event.date + "T12:00:00").toLocaleDateString(
                  "pt-BR",
                  { day: "2-digit", month: "short", year: "numeric" },
                )
              : "Data não definida"}
          </span>
          <span>
            <MapPin />
            {data.event.city}
          </span>
          <button onClick={() => open("event")}>Editar evento</button>
        </div>
        <div className="metrics">
          <M
            t="Projeção total"
            v={money(totalFinal)}
            s={data.expenses.length + " itens cadastrados"}
          />
          <M t="Já pago" v={money(totalPaid)} s={money(pending) + " a pagar"} />
          <M
            t="Saldo do orçamento"
            v={data.event.budget ? money(data.event.budget - totalFinal) : "—"}
            s={data.event.budget ? pct + "% utilizado" : "Definir orçamento"}
          />
          <M
            t="Convidados confirmados"
            v={confirmed + " / " + data.guests.length}
            s={
              confirmed
                ? "Custo: " + money(cost) + " / pessoa"
                : "Aguardando confirmações"
            }
          />
        </div>
        {data.expenses.length ? (
          <>
            <div className="analytics">
              <div className="panel chart">
                <h3>Gastos por categoria</h3>
                <p>Onde o dinheiro do chá está concentrado.</p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={catData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={2}
                    >
                      {catData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              "#c21f5b",
                              "#e06791",
                              "#9b6b83",
                              "#e6a9bf",
                              "#6f5968",
                              "#d7c0ca",
                            ][i % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="panel chart">
                <h3>Previsto × realizado</h3>
                <p>Compare a estimativa inicial com o valor fechado.</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={compData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                    <Bar
                      dataKey="Previsto"
                      fill="#d9c5cf"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="Realizado"
                      fill="#c21f5b"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <Insights />
          </>
        ) : (
          <div className="panel">
            <Empty
              I={WalletCards}
              t="O orçamento começa aqui"
              d="Cadastre os itens do chá para liberar as análises financeiras."
              b="Cadastrar primeiro gasto"
              type="expense"
            />
          </div>
        )}
      </>
    );
  }
  function Insights() {
    let biggest = [...data.expenses].sort((a, b) => b.final - a.final)[0],
      top = [...catData].sort((a, b) => b.value - a.value)[0],
      over = data.event.budget && totalFinal > data.event.budget;
    return (
      <div className="panel insights">
        <h3>Análises automáticas</h3>
        <div className="insightgrid">
          <div>
            <TrendingUp />
            <b>Maior gasto</b>
            <span>
              {biggest ? biggest.name + " · " + money(biggest.final) : "—"}
            </span>
          </div>
          <div>
            <CircleDollarSign />
            <b>Categoria com maior peso</b>
            <span>
              {top
                ? top.name +
                  " · " +
                  Math.round((top.value / totalFinal) * 100) +
                  "% do total"
                : "—"}
            </span>
          </div>
          <div>
            <AlertTriangle />
            <b>Situação do orçamento</b>
            <span>
              {data.event.budget
                ? over
                  ? "Acima em " + money(totalFinal - data.event.budget)
                  : money(data.event.budget - totalFinal) + " disponíveis"
                : "Defina um orçamento"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  function Empty({ I, t, d, b, type }) {
    return (
      <div className="empty">
        <i>
          <I />
        </i>
        <h3>{t}</h3>
        <p>{d}</p>
        <button className="primary" onClick={() => open(type)}>
          <Plus />
          {b}
        </button>
      </div>
    );
  }
  function SearchBox({ children, ph }) {
    return (
      <div className="box">
        <div className="search">
          <Search />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ph}
          />
          <button>Todos⌄</button>
        </div>
        {children}
      </div>
    );
  }
  function Guests() {
    let a = data.guests.filter((x) =>
      x.name.toLowerCase().includes(q.toLowerCase()),
    );
    return (
      <>
        <Title
          t="Convidados"
          d="Cada pessoa, um carinho para a Malu."
          a="Adicionar convidado"
          type="guest"
        />
        <div className="count">
          <b>{data.guests.length}</b> convidados　 <b>{confirmed}</b>{" "}
          confirmados
        </div>
        <SearchBox ph="Buscar nome ou família">
          {a.length ? (
            a.map((x) => <SimpleRow key={x.id} x={x} kind="guests" />)
          ) : (
            <Empty
              I={Users}
              t="Quem está na lista?"
              d="Adicione uma pessoa por cadastro, incluindo as crianças."
              b="Adicionar primeiro convidado"
              type="guest"
            />
          )}
        </SearchBox>
      </>
    );
  }
  function Expenses() {
    let a = data.expenses.filter((x) =>
      (x.name + (x.category || "")).toLowerCase().includes(q.toLowerCase()),
    );
    return (
      <>
        <Title
          t="Gastos"
          d="Do primeiro orçamento ao último pagamento."
          a="Adicionar gasto"
          type="expense"
        />
        <div className="metrics boxed">
          <M t="Previsto" v={money(totalEstimated)} />
          <M t="Valor final" v={money(totalFinal)} />
          <M t="Total pago" v={money(totalPaid)} />
          <M t="A pagar" v={money(pending)} />
        </div>
        <SearchBox ph="Buscar item ou categoria">
          {a.length ? (
            <div>
              {a.map((x) => (
                <ExpenseRow key={x.id} x={x} />
              ))}
            </div>
          ) : (
            <Empty
              I={WalletCards}
              t="Cada detalhe na conta"
              d="Cadastre compras e serviços, valores e pagamentos."
              b="Adicionar primeiro gasto"
              type="expense"
            />
          )}
        </SearchBox>
      </>
    );
  }
  // function ExpenseRow({ x }) {
  //   let p = paidFor(x),
  //     bal = Math.max(0, x.final - p),
  //     status =
  //       x.final && p >= x.final
  //         ? "Pago"
  //         : p > 0
  //           ? "Parcialmente pago"
  //           : "Pendente";
  //   return (
  //     <div className="expenseRow">
  //       <div>
  //         <b>{x.name}</b>
  //         <small>
  //           {x.category} {x.supplier ? "· " + x.supplier : ""}
  //         </small>
  //       </div>
  //       <div>
  //         <small>Valor final</small>
  //         <b>{money(x.final)}</b>
  //       </div>
  //       <div>
  //         <small>Total pago</small>
  //         <b>{money(p)}</b>
  //       </div>
  //       <div>
  //         <small>Saldo</small>
  //         <b>{money(bal)}</b>
  //       </div>
  //       <span
  //         className={
  //           "status " +
  //           (status === "Pago"
  //             ? "ok"
  //             : status === "Parcialmente pago"
  //               ? "partial"
  //               : "")
  //         }
  //       >
  //         {status}
  //       </span>
  //       <button className="iconbtn" onClick={() => open("expense", x)}>
  //         <Pencil />
  //       </button>
  //       <button className="iconbtn" onClick={() => open("payment", x)}>
  //         <Plus />
  //       </button>
  //     </div>
  //   );
  //   async function deleteExpense() {
  //     const confirmar = window.confirm(
  //       `Deseja realmente excluir "${x.name}"?\n\nTodos os pagamentos desse gasto também serão excluídos.`,
  //     );

  //     if (!confirmar) return;

  //     const { error } = await supabase.from("expenses").delete().eq("id", x.id);

  //     if (error) {
  //       alert("Erro ao excluir: " + error.message);

  //       return;
  //     }

  //     await loadData();
  //   }
  // }

  function ExpenseRow({ x }) {
    const p = paidFor(x);
    const bal = Math.max(0, Number(x.final || 0) - p);
    const status =
      Number(x.final || 0) > 0 && p >= Number(x.final || 0)
        ? "Pago"
        : p > 0
          ? "Parcialmente pago"
          : "Pendente";

    async function deleteExpense() {
      const confirmar = window.confirm(
        `Deseja realmente excluir "${x.name}"?\n\nTodos os pagamentos desse gasto também serão excluídos.`,
      );
      if (!confirmar) return;

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", x.id);

      if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
      }

      await loadData();
    }

    return (
      <div className="expenseRow">
        <div>
          <b>{x.name}</b>
          <small>
            {x.category} {x.supplier ? "· " + x.supplier : ""}
          </small>
        </div>
        <div><small>Valor final</small><b>{money(x.final)}</b></div>
        <div><small>Total pago</small><b>{money(p)}</b></div>
        <div><small>Saldo</small><b>{money(bal)}</b></div>
        <span className={"status " + (status === "Pago" ? "ok" : status === "Parcialmente pago" ? "partial" : "")}>
          {status}
        </span>
        <button className="iconbtn" onClick={() => open("expense", x)} title="Editar gasto">
          <Pencil />
        </button>
        <button className="iconbtn" onClick={() => open("payment", x)} title="Registrar pagamento">
          <Plus />
        </button>
        <button className="iconbtn deletebtn" onClick={deleteExpense} title="Excluir gasto">
          <Trash2 />
        </button>
      </div>
    );
  }

  function Suppliers() {
    let a = data.suppliers.filter((x) =>
      (x.name + (x.contact || "")).toLowerCase().includes(q.toLowerCase()),
    );
    return (
      <>
        <Title
          t="Fornecedores"
          d="Contatos e serviços em um só lugar."
          a="Adicionar fornecedor"
          type="supplier"
        />
        <div className="count">
          <b>{data.suppliers.length}</b> fornecedores cadastrados
        </div>
        <SearchBox ph="Buscar fornecedor ou contato">
          {a.length ? (
            a.map((x) => <SimpleRow key={x.id} x={x} kind="suppliers" />)
          ) : (
            <Empty
              I={Store}
              t="Quem vai cuidar dos detalhes?"
              d="Guarde os contatos de quem vai fazer parte do chá."
              b="Cadastrar primeiro fornecedor"
              type="supplier"
            />
          )}
        </SearchBox>
      </>
    );
  }
  function SimpleRow({ x, kind }) {
    return (
      <div className="row">
        <b>{x.name}</b>
        <span>{kind === "guests" ? x.family : x.service}</span>
        <span>{kind === "guests" ? x.status : x.contact}</span>
        <button
          onClick={() => open(kind === "guests" ? "guest" : "supplier", x)}
        >
          <Pencil />
        </button>
        <button onClick={() => removeRow(kind, x.id)}>
          <Trash2 />
        </button>
      </div>
    );
  }
  function Modal() {
    let type = modal;
    async function sub(e) {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const o = Object.fromEntries(f);
      let error = null;

      if (type === "event") {
        const payload = {
          event_date: o.date || null,
          city: o.city,
          budget: Number(o.budget || 0),
          updated_at: new Date().toISOString(),
        };
        if (data.event.id)
          ({ error } = await supabase
            .from("events")
            .update(payload)
            .eq("id", data.event.id));
        else
          ({ error } = await supabase
            .from("events")
            .insert({ name: "Chá da Malu", ...payload }));
      } else if (type === "payment") {
        ({ error } = await supabase.from("payments").insert({
          expense_id: edit.id,
          value: Number(o.value || 0),
          payment_date: o.date || null,
          description: o.note || "Pagamento",
        }));
      } else if (type === "guest") {
        const payload = {
          name: o.name,
          family: o.family || null,
          status: o.status || "Aguardando",
        };
        if (edit)
          ({ error } = await supabase
            .from("guests")
            .update(payload)
            .eq("id", edit.id));
        else ({ error } = await supabase.from("guests").insert(payload));
      } else if (type === "supplier") {
        const payload = {
          name: o.name,
          service: o.service || null,
          contact: o.contact || null,
        };
        if (edit)
          ({ error } = await supabase
            .from("suppliers")
            .update(payload)
            .eq("id", edit.id));
        else ({ error } = await supabase.from("suppliers").insert(payload));
      } else if (type === "expense") {
        const selectedSupplier = data.suppliers.find(
          (s) => s.name === o.supplier,
        );
        const payload = {
          name: o.name,
          category: o.category || null,
          supplier_id: selectedSupplier?.id || null,
          estimated: Number(o.estimated || 0),
          final: Number(o.final || 0),
          due_date: o.dueDate || null,
          notes: o.notes || null,
          updated_at: new Date().toISOString(),
        };
        let expenseId = edit?.id;
        if (edit) {
          ({ error } = await supabase
            .from("expenses")
            .update(payload)
            .eq("id", edit.id));
        } else {
          const result = await supabase
            .from("expenses")
            .insert(payload)
            .select("id")
            .single();
          error = result.error;
          expenseId = result.data?.id;
        }
        if (!error && !edit && Number(o.entry || 0) > 0 && expenseId) {
          const pay = await supabase.from("payments").insert({
            expense_id: expenseId,
            value: Number(o.entry),
            payment_date: o.entryDate || null,
            description: "Entrada",
          });
          error = pay.error;
        }
      }

      if (error) {
        console.error(error);
        alert("Erro ao salvar: " + error.message);
        return;
      }
      setModal(null);
      setEdit(null);
      await loadData();
    }
    return (
      <div className="overlay">
        <form className="modal" onSubmit={sub}>
          <button type="button" className="x" onClick={() => setModal(null)}>
            <X />
          </button>
          <h2>
            {type === "payment"
              ? "Registrar pagamento"
              : edit
                ? "Editar cadastro"
                : type === "guest"
                  ? "Adicionar convidado"
                  : type === "expense"
                    ? "Adicionar gasto"
                    : type === "supplier"
                      ? "Adicionar fornecedor"
                      : "Dados do evento"}
          </h2>
          {type === "guest" && (
            <>
              <F n="name" l="Nome" val={edit?.name} />
              <F n="family" l="Família" val={edit?.family} />
              <S
                n="status"
                l="Status"
                val={edit?.status}
                o={["Aguardando", "Confirmado", "Não vai"]}
              />
            </>
          )}
          {type === "expense" && (
            <>
              <F n="name" l="Item / serviço" val={edit?.name} />
              <S
                n="category"
                l="Categoria"
                val={edit?.category}
                o={[
                  "Comidas e bebidas",
                  "Decoração",
                  "Local",
                  "Lembrancinhas",
                  "Convites",
                  "Fotografia",
                  "Outros",
                ]}
              />
              <F n="supplier" l="Fornecedor" val={edit?.supplier} />
              <div className="twocol">
                <F
                  n="estimated"
                  l="Valor previsto (R$)"
                  type="number"
                  val={edit?.estimated}
                />
                <F
                  n="final"
                  l="Valor final (R$)"
                  type="number"
                  val={edit?.final}
                />
              </div>
              {!edit && (
                <>
                  <div className="twocol">
                    <F n="entry" l="Entrada (R$)" type="number" />
                    <F n="entryDate" l="Data da entrada" type="date" />
                  </div>
                </>
              )}
              <F n="dueDate" l="Vencimento" type="date" val={edit?.dueDate} />
              <F n="notes" l="Observações" val={edit?.notes} req={false} />
              {edit && <PaymentHistory x={edit} />}
            </>
          )}
          {type === "payment" && (
            <>
              <p>
                Gasto: <b>{edit.name}</b>
              </p>
              <F n="value" l="Valor do pagamento (R$)" type="number" />
              <F n="date" l="Data" type="date" />
              <F n="note" l="Descrição" val="Pagamento" />
            </>
          )}
          {type === "supplier" && (
            <>
              <F n="name" l="Fornecedor" val={edit?.name} />
              <F n="service" l="Serviço" val={edit?.service} />
              <F n="contact" l="Contato" val={edit?.contact} />
            </>
          )}
          {type === "event" && (
            <>
              <F n="date" l="Data" type="date" val={data.event.date} />
              <F n="city" l="Cidade" val={data.event.city} />
              <F
                n="budget"
                l="Orçamento (R$)"
                type="number"
                val={data.event.budget}
              />
            </>
          )}
          <button className="primary full">Salvar</button>
        </form>
      </div>
    );
  }
  function PaymentHistory({ x }) {
    return (
      <div className="history">
        <b>Histórico de pagamentos</b>
        {(x.payments || []).length ? (
          (x.payments || []).map((p) => (
            <div key={p.id}>
              <span>
                {p.date || "Sem data"} · {p.note}
              </span>
              <strong>{money(p.value)}</strong>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase
                    .from("payments")
                    .delete()
                    .eq("id", p.id);
                  if (error)
                    return alert("Erro ao excluir pagamento: " + error.message);
                  const payments = x.payments.filter((z) => z.id !== p.id);
                  setEdit({ ...x, payments });
                  await loadData();
                }}
              >
                <Trash2 />
              </button>
            </div>
          ))
        ) : (
          <small>Nenhum pagamento registrado.</small>
        )}
      </div>
    );
  }
  function F({ n, l, type = "text", val, req = true }) {
    return (
      <label className="field">
        {l}
        <input name={n} type={type} defaultValue={val || ""} required={req} />
      </label>
    );
  }
  function S({ n, l, o, val }) {
    return (
      <label className="field">
        {l}
        <select name={n} defaultValue={val}>
          {o.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="app">
      <aside>
        <div className="brand">
          Malu<span>.</span>
        </div>
        <div className="sub">CHÁ DE BEBÊ</div>
        <nav>
          {nav.map(([n, I]) => (
            <button
              key={n}
              className={page === n ? "active" : ""}
              onClick={() => {
                setPage(n);
                setQ("");
              }}
            >
              <I />
              {n}
            </button>
          ))}
        </nav>
        <div className="bottom">
          <div>
            <Heart />
            Um dia para a Malu
          </div>
          <hr />
          <button onClick={() => open("event")}>
            <Settings />
            Dados do evento
          </button>
        </div>
      </aside>
      <main>
        <header>
          <span>Chá da Malu</span>
          <b>/</b>
          <strong>{page}</strong>
          <div className="sync">
            <Cloud />
            {loading
              ? "Sincronizando..."
              : syncError
                ? "Erro de sincronização"
                : "Dados na nuvem"}
            <button className="iconbtn" onClick={loadData} title="Atualizar">
              <RefreshCw />
            </button>
          </div>
        </header>
        <section>
          {page === "Visão geral" ? (
            <Dashboard />
          ) : page === "Convidados" ? (
            <Guests />
          ) : page === "Gastos" ? (
            <Expenses />
          ) : (
            <Suppliers />
          )}
        </section>
      </main>
      {modal && <Modal />}
    </div>
  );
}
