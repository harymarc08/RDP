"use client";

import React, { useMemo, useState, useEffect } from "react";
import PetriNetGraph from "./PetriNetGraph";

// --- Réseau de Petri : Machine à café (version simulation, sans CRUD) ---
// Places (id, label, group)
const PLACES = [
  { id: "p1", label: "AttenteClient", group: "flux" },
  { id: "p2", label: "InsertionMonnaie", group: "flux" },
  { id: "p3", label: "VérificationPaiement", group: "flux" },
  { id: "p4", label: "ChoixBoisson", group: "flux" },
  { id: "p5", label: "VérificationStock", group: "flux" },
  { id: "p6", label: "EauEnChauffe", group: "flux" },
  { id: "p7", label: "EauPrête", group: "flux" },
  { id: "p8", label: "PréparationCafé", group: "flux" },
  { id: "p9", label: "CaféPrêt", group: "flux" },
  { id: "p10", label: "DistributionBoisson", group: "flux" },
  { id: "p11", label: "RetourAuRepos", group: "flux" },
  { id: "p12", label: "GobeletDispo", group: "stock" },
  { id: "p13", label: "DoseCafeDispo", group: "stock" },
  { id: "p14", label: "DoseEauDispo", group: "stock" },
];

// Transitions
const TRANSITIONS = [
  { id: "t1", label: "InsérerPièce" },
  { id: "t2", label: "ValiderMonnaie" },
  { id: "t3", label: "PaiementInsuffisant" },
  { id: "t4", label: "AccèsChoixBoisson" },
  { id: "t5", label: "ChoisirBoisson" },
  { id: "t6", label: "StockOK" },
  { id: "t7", label: "StockKO" },
  { id: "t8", label: "LancerChauffe" },
  { id: "t9", label: "DémarrerPréparation" },
  { id: "t10", label: "FinPréparation" },
  { id: "t11", label: "Distribuer" },
  { id: "t12", label: "PrendreBoisson" },
  { id: "t13", label: "Reset" },
  { id: "t14", label: "Annuler" },
];

// Arcs (source -> target, poids)
const ARCS = [
  // flux principal
  ["p1", "t1", 1], ["t1", "p2", 1],
  ["p2", "t2", 1], ["t2", "p3", 1],
  ["p3", "t4", 1], ["t4", "p4", 1],
  ["p4", "t5", 1], ["t5", "p5", 1],
  ["p5", "t6", 1], ["t6", "p6", 1],
  ["p6", "t8", 1], ["t8", "p7", 1],
  ["p7", "t9", 1], ["t9", "p8", 1],
  ["p8", "t10", 1], ["t10", "p9", 1],
  ["p9", "t11", 1], ["t11", "p10", 1],
  ["p10", "t12", 1], ["t12", "p11", 1],
  ["p11", "t13", 1], ["t13", "p1", 1],
  // boucle paiement insuffisant
  ["p3", "t3", 1], ["t3", "p2", 1],
  // issues vérif stock - StockKO retourne vers ChoixBoisson
  ["p5", "t7", 1], ["t7", "p4", 1],
  // ressources consommées par t6
  ["p12", "t6", 1], ["p13", "t6", 1], ["p14", "t6", 1],
  // annulation
  ["p2", "t14", 1], ["p4", "t14", 1], ["t14", "p11", 1],
] as const;

// Marquage initial
const INITIAL_MARKING = {
  p1: 1,
  p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0, p10: 0, p11: 0,
  p12: 10, // gobelets
  p13: 50, // doses café
  p14: 100, // dose eau
};

type PlaceId = keyof typeof INITIAL_MARKING;
type TransitionId = typeof TRANSITIONS[number]['id'];
type Marking = Record<PlaceId, number>;
type Matrix = Record<PlaceId, Record<TransitionId, number>>;

// Construit Pre et Post: Pre[p][t] et Post[p][t]
function buildMatrices(): { Pre: Matrix; Post: Matrix } {
  const placeIds = PLACES.map(p => p.id) as PlaceId[];
  const transIds = TRANSITIONS.map(t => t.id) as TransitionId[];
  const Pre = Object.fromEntries(placeIds.map(pid => [pid, Object.fromEntries(transIds.map(t => [t, 0]))])) as Matrix;
  const Post = Object.fromEntries(placeIds.map(pid => [pid, Object.fromEntries(transIds.map(t => [t, 0]))])) as Matrix;

  for (const [src, dst, w] of ARCS) {
    if (src.startsWith("p") && dst.startsWith("t")) {
      Pre[src as PlaceId][dst as TransitionId] += w;
    } else if (src.startsWith("t") && dst.startsWith("p")) {
      Post[dst as PlaceId][src as TransitionId] += w;
    }
  }
  return { Pre, Post };
}

function isEnabled(tid: TransitionId, marking: Marking, Pre: Matrix): boolean {
  // Une transition est tirable si toutes ses entrées sont couvertes
  for (const pid of Object.keys(Pre) as PlaceId[]) {
    const need = Pre[pid][tid];
    if (need > 0 && (marking[pid] ?? 0) < need) return false;
  }
  return true;
}

function isMachineRunning(marking: Marking): boolean {
  // La machine est considérée comme en cours de fonctionnement si des jetons
  // sont présents dans les places du processus de préparation
  const processingPlaces: PlaceId[] = ['p6', 'p7', 'p8', 'p9', 'p10'];
  return processingPlaces.some(pid => (marking[pid] ?? 0) > 0);
}

function canStartNewCycle(tid: TransitionId, marking: Marking): boolean {
  // Transitions qui démarrent un nouveau cycle (jusqu'à la vérification du stock)
  const startTransitions: TransitionId[] = ['t1', 't2', 't4', 't5'];
  
  if (startTransitions.includes(tid)) {
    return !isMachineRunning(marking);
  }
  
  // Les autres transitions peuvent toujours être exécutées si elles sont activées
  return true;
}

function fire(tid: TransitionId, marking: Marking, Pre: Matrix, Post: Matrix): Marking {
  const next = { ...marking };
  // consomme
  for (const pid of Object.keys(Pre) as PlaceId[]) {
    const need = Pre[pid][tid];
    if (need > 0) next[pid] = (next[pid] || 0) - need;
  }
  // produit
  for (const pid of Object.keys(Post) as PlaceId[]) {
    const add = Post[pid][tid];
    if (add > 0) next[pid] = (next[pid] || 0) + add;
  }
  return next;
}

interface TokenDotsProps {
  n: number;
}

function TokenDots({ n }: TokenDotsProps) {
  if (n <= 0) return null;
  if (n <= 5) {
    return (
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: n }).map((_, i) => (
          <span key={i} className="inline-block w-2.5 h-2.5 rounded-full bg-gray-800" />
        ))}
      </div>
    );
  }
  return <span className="text-xs font-semibold">{n}</span>;
}

interface LogEntry {
  step: number;
  action: string;
  marking: Marking;
}

export default function CoffeePetriSim() {
  const { Pre, Post } = useMemo(buildMatrices, []);
  const [marking, setMarking] = useState<Marking>(INITIAL_MARKING);
  const [showStock, setShowStock] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([{ step: 0, action: "Init", marking: INITIAL_MARKING }]);
  const [step, setStep] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [isMounted, setIsMounted] = useState(false);

  // Éviter les problèmes d'hydratation
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const enabledTransitions = TRANSITIONS.filter(t => 
    isEnabled(t.id, marking, Pre) && canStartNewCycle(t.id, marking)
  );
  const machineRunning = isMachineRunning(marking);

  const onFire = (tid: TransitionId) => {
    const next = fire(tid, marking, Pre, Post);
    const s = step + 1;
    setMarking(next);
    setStep(s);
    setLog(l => [...l, { step: s, action: `Tirer ${TRANSITIONS.find(t => t.id===tid)?.label}`, marking: next }]);
  };

  const onReset = () => {
    setMarking(INITIAL_MARKING);
    setStep(0);
    setLog([{ step: 0, action: "Init", marking: INITIAL_MARKING }]);
  };

  const onRandomStep = () => {
    if (enabledTransitions.length === 0) return;
    const pick = enabledTransitions[Math.floor(Math.random() * enabledTransitions.length)];
    onFire(pick.id);
  };

  const fluxPlaces = PLACES.filter(p => p.group === "flux");
  const stockPlaces = PLACES.filter(p => p.group === "stock");

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">{/* Agrandissement du conteneur */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Simulateur — Réseau de Petri : Machine à café</h1>
            {machineRunning && (
              <div className="mt-1 flex items-center gap-2 text-orange-600">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-sm font-medium">Machine en cours de fonctionnement</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600'}`}
              >
                Mode Liste
              </button>
              <button 
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'graph' ? 'bg-white shadow' : 'text-gray-600'}`}
              >
                Mode Graphe
              </button>
            </div>
            <button onClick={onReset} className="px-3 py-1.5 rounded-2xl shadow bg-gray-100 hover:bg-gray-200">Reset</button>
            <button 
              onClick={onRandomStep} 
              disabled={enabledTransitions.length === 0}
              className={`px-3 py-1.5 rounded-2xl shadow ${enabledTransitions.length > 0 ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              Étape aléatoire
            </button>
          </div>
        </header>

        {viewMode === 'graph' ? (
          // Mode Graphe - Utilisation maximale de l'espace
          <section className="space-y-6">
            {isMounted ? (
              <div className="w-full">
                <PetriNetGraph
                  places={PLACES}
                  transitions={TRANSITIONS}
                  arcs={ARCS}
                  marking={marking}
                  enabledTransitions={enabledTransitions.map(t => t.id)}
                  onTransitionClick={onFire}
                />
              </div>
            ) : (
              <div className="w-full h-96 flex items-center justify-center text-gray-500">
                Chargement du graphique...
              </div>
            )}
          </section>
        ) : (
          // Mode Liste
          <section className="grid md:grid-cols-3 gap-6">
            {/* Places: flux */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold">Places — Flux</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fluxPlaces.map(p => (
                  <div key={p.id} className="p-3 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.label}</div>
                      <TokenDots n={marking[p.id as PlaceId] || 0} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{p.id}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transitions */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Transitions (tirables en vert)</h2>
              <div className="space-y-2">
                {TRANSITIONS.map(t => {
                  const enabled = isEnabled(t.id, marking, Pre);
                  const canStart = canStartNewCycle(t.id, marking);
                  const canFire = enabled && canStart;
                  
                  return (
                    <div key={t.id} className={`flex items-center justify-between p-2 rounded-xl border ${canFire ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-gray-500">{t.id}</div>
                        {enabled && !canStart && (
                          <div className="text-xs text-orange-600 mt-1">Machine occupée</div>
                        )}
                      </div>
                      <button
                        disabled={!canFire}
                        onClick={() => onFire(t.id)}
                        className={`px-3 py-1.5 rounded-2xl shadow ${canFire ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        Tirer
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="grid md:grid-cols-3 gap-6">
          {/* Stock */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ressources (Stock)</h2>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" className="accent-black" checked={showStock} onChange={e => setShowStock(e.target.checked)} />
                Afficher le stock
              </label>
            </div>
            {showStock && (
              <div className="grid sm:grid-cols-3 gap-3">
                {stockPlaces.map(p => (
                  <div key={p.id} className="p-3 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.label}</div>
                      <TokenDots n={marking[p.id as PlaceId] || 0} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{p.id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Journal */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Journal des étapes</h2>
            <div className="max-h-72 overflow-auto rounded-2xl border border-gray-200 divide-y">
              {log.map((e, idx) => (
                <div key={idx} className="p-2 text-sm">
                  <div className="font-medium">{e.step}. {e.action}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Matrices (lecture seule) */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Matrice d&apos;incidence (lecture seule)</h2>
          <div className="overflow-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Place / Transition</th>
                  {TRANSITIONS.map(t => (
                    <th key={t.id} className="p-2 text-left">{t.id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLACES.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 font-medium">{p.id}</td>
                    {TRANSITIONS.map(t => (
                      <td key={t.id} className="p-2">
                        {(Post[p.id as PlaceId]?.[t.id] || 0) - (Pre[p.id as PlaceId]?.[t.id] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
