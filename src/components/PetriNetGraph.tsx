"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

interface PetriNetGraphProps {
  places: { id: string; label: string; group: string }[];
  transitions: { id: string; label: string }[];
  arcs: readonly (readonly [string, string, number])[];
  marking: Record<string, number>;
  enabledTransitions: string[];
  onTransitionClick: (transitionId: string) => void;
}

const PetriNetGraph: React.FC<PetriNetGraphProps> = ({
  places,
  transitions,
  arcs,
  marking,
  enabledTransitions,
  onTransitionClick,
}) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>(() => {
    // Position initiale automatique de haut en bas (flux logique)
    const positions: Record<string, NodePosition> = {};
    const width = 800;
    const height = 600;
    
    // Définir les niveaux logiques du flux de la machine à café
    const levels = [
      // Niveau 0: État initial
      { y: 80, nodes: ['p1'] }, // AttenteClient
      
      // Niveau 1: Insertion monnaie
      { y: 140, nodes: ['t1'] }, // InsérerPièce
      { y: 180, nodes: ['p2'] }, // InsertionMonnaie
      
      // Niveau 2: Vérification paiement
      { y: 240, nodes: ['t2', 't3'] }, // ValiderMonnaie, PaiementInsuffisant
      { y: 280, nodes: ['p3'] }, // VérificationPaiement
      
      // Niveau 3: Accès choix
      { y: 340, nodes: ['t4'] }, // AccèsChoixBoisson
      { y: 380, nodes: ['p4'] }, // ChoixBoisson
      
      // Niveau 4: Choix et vérification stock
      { y: 440, nodes: ['t5'] }, // ChoisirBoisson
      { y: 480, nodes: ['p5'] }, // VérificationStock
      
      // Niveau 5: Stock (ressources à droite)
      { y: 480, nodes: ['p12', 'p13', 'p14'] }, // Ressources
      { y: 540, nodes: ['t6', 't7'] }, // StockOK, StockKO
      
      // Niveau 6: Chauffage
      { y: 580, nodes: ['p6'] }, // EauEnChauffe
      { y: 620, nodes: ['t8'] }, // LancerChauffe
      
      // Niveau 7: Préparation
      { y: 680, nodes: ['p7'] }, // EauPrête
      { y: 720, nodes: ['t9'] }, // DémarrerPréparation
      { y: 760, nodes: ['p8'] }, // PréparationCafé
      { y: 800, nodes: ['t10'] }, // FinPréparation
      
      // Niveau 8: Distribution
      { y: 840, nodes: ['p9'] }, // CaféPrêt
      { y: 880, nodes: ['t11'] }, // Distribuer
      { y: 920, nodes: ['p10'] }, // DistributionBoisson
      { y: 960, nodes: ['t12'] }, // PrendreBoisson
      
      // Niveau 9: Retour et reset
      { y: 1000, nodes: ['p11'] }, // RetourAuRepos
      { y: 1040, nodes: ['t13', 't14'] }, // Reset, Annuler
    ];
    
    // Placer les nœuds selon les niveaux
    levels.forEach(level => {
      const nodesAtLevel = level.nodes;
      const spacing = Math.min(width / (nodesAtLevel.length + 1), 120);
      const startX = (width - (nodesAtLevel.length - 1) * spacing) / 2;
      
      nodesAtLevel.forEach((nodeId, index) => {
        // Cas spéciaux pour les ressources (les placer à droite)
        if (['p12', 'p13', 'p14'].includes(nodeId)) {
          positions[nodeId] = {
            id: nodeId,
            x: width - 100 - (index * 80),
            y: level.y,
          };
        } else {
          positions[nodeId] = {
            id: nodeId,
            x: startX + (index * spacing),
            y: level.y,
          };
        }
      });
    });
    
    return positions;
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // Éviter les problèmes d'hydratation
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fonction pour calculer les positions des flèches
  const calculateArrowPosition = (source: NodePosition, target: NodePosition) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };
    
    const unitX = dx / length;
    const unitY = dy / length;
    
    // Ajuster pour les rayons des éléments
    const sourceRadius = 25; // rayon des places/transitions
    const targetRadius = 25;
    
    return {
      x1: source.x + unitX * sourceRadius,
      y1: source.y + unitY * sourceRadius,
      x2: target.x - unitX * targetRadius,
      y2: target.y - unitY * targetRadius,
    };
  };

  // Gestion du drag & drop
  const handleMouseDown = useCallback((nodeId: string) => (e: React.MouseEvent) => {
    if (!isAnimated) return;
    e.preventDefault();
    setDraggedNode(nodeId);
  }, [isAnimated]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNode || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setNodePositions(prev => ({
      ...prev,
      [draggedNode]: { ...prev[draggedNode], x, y }
    }));
  }, [draggedNode]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const toggleAnimation = () => {
    setIsAnimated(!isAnimated);
  };

  // Ne pas rendre le composant tant qu'il n'est pas monté côté client
  if (!isMounted) {
    return (
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            Réseau de Petri - Machine à Café
          </h3>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="w-full h-96 flex items-center justify-center text-gray-500">
            Chargement du graphique...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Réseau de Petri - Machine à Café
        </h3>
        <button
          onClick={toggleAnimation}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isAnimated
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isAnimated ? 'Immobiliser' : 'Activer déplacement'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4">
        <svg
          ref={svgRef}
          width="800"
          height="1100"
          className="w-full h-auto border rounded-lg"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Définition des dégradés */}
          <defs>
            {/* Dégradé pour les places */}
            <radialGradient id="placeGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
            </radialGradient>
            
            {/* Dégradé pour les places avec jetons */}
            <radialGradient id="placeActiveGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
            </radialGradient>
            
            {/* Dégradé pour les places de ressource */}
            <radialGradient id="resourceGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#d1fae5" stopOpacity={0.9} />
              <stop offset="70%" stopColor="#34d399" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#059669" stopOpacity={1} />
            </radialGradient>
            
            {/* Dégradé pour les transitions désactivées */}
            <linearGradient id="transitionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>
            
            {/* Dégradé pour les transitions activées */}
            <linearGradient id="enabledGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            
            {/* Effet de pulsation pour les transitions activées */}
            <animate id="pulse" attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
            
            {/* Filtre d'ombre avancé */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="2" dy="3" result="offset" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge> 
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
            
            {/* Filtre de lueur pour les éléments actifs */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Motif pour les arcs */}
            <pattern id="arcPattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="none"/>
              <circle cx="4" cy="4" r="1" fill="#4a5568" opacity="0.3"/>
            </pattern>
            
            {/* Marqueur de flèche amélioré */}
            <marker
              id="arrowhead"
              viewBox="0 -5 10 10"
              refX="9"
              refY="0"
              orient="auto"
              markerWidth="8"
              markerHeight="8"
            >
              <path d="M0,-5L10,0L0,5Z" fill="#1f2937" stroke="#1f2937" strokeWidth="0.5" />
            </marker>
            
            {/* Marqueur de flèche pour arcs actifs */}
            <marker
              id="arrowheadActive"
              viewBox="0 -5 10 10"
              refX="9"
              refY="0"
              orient="auto"
              markerWidth="8"
              markerHeight="8"
            >
              <path d="M0,-5L10,0L0,5Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
            </marker>
          </defs>

          {/* Arrière-plan principal avec motif */}
          <rect width="100%" height="100%" fill="url(#backgroundGradient)" />
          
          {/* Grille de fond subtile */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
            <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Groupes de phases avec design amélioré */}
          <g opacity="0.9">
            <rect x="50" y="50" width="700" height="100" fill="url(#phaseGradient1)" stroke="#3b82f6" strokeWidth="2" rx="15" />
            <text x="70" y="75" fill="#e0e7ff" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
              🎯 Phase 1: Attente Client
            </text>
          </g>
          
          <g opacity="0.9">
            <rect x="50" y="170" width="700" height="180" fill="url(#phaseGradient2)" stroke="#10b981" strokeWidth="2" rx="15" />
            <text x="70" y="195" fill="#d1fae5" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
              💰 Phase 2: Paiement & Vérification
            </text>
          </g>
          
          <g opacity="0.9">
            <rect x="50" y="370" width="700" height="280" fill="url(#phaseGradient3)" stroke="#f59e0b" strokeWidth="2" rx="15" />
            <text x="70" y="395" fill="#fef3c7" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
              ☕ Phase 3: Sélection & Gestion Stock
            </text>
          </g>
          
          <g opacity="0.9">
            <rect x="50" y="670" width="700" height="300" fill="url(#phaseGradient4)" stroke="#ef4444" strokeWidth="2" rx="15" />
            <text x="70" y="695" fill="#fee2e2" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
              🔥 Phase 4: Chauffage & Préparation
            </text>
          </g>
          
          <g opacity="0.9">
            <rect x="50" y="990" width="700" height="140" fill="url(#phaseGradient5)" stroke="#8b5cf6" strokeWidth="2" rx="15" />
            <text x="70" y="1015" fill="#ede9fe" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">
              🎁 Phase 5: Distribution & Reset
            </text>
          </g>

          {/* Ajout des dégradés pour les phases */}
          <defs>
            <linearGradient id="phaseGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0.25)" />
            </linearGradient>
            <linearGradient id="phaseGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.15)" />
              <stop offset="100%" stopColor="rgba(5, 150, 105, 0.25)" />
            </linearGradient>
            <linearGradient id="phaseGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.15)" />
              <stop offset="100%" stopColor="rgba(217, 119, 6, 0.25)" />
            </linearGradient>
            <linearGradient id="phaseGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 0.15)" />
              <stop offset="100%" stopColor="rgba(220, 38, 38, 0.25)" />
            </linearGradient>
            <linearGradient id="phaseGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(124, 58, 237, 0.25)" />
            </linearGradient>
          </defs>

          {/* Arcs améliorés */}
          {arcs.map((arc, index) => {
            const sourcePos = nodePositions[arc[0]];
            const targetPos = nodePositions[arc[1]];
            
            if (!sourcePos || !targetPos) return null;
            
            const arrowPos = calculateArrowPosition(sourcePos, targetPos);
            
            // Déterminer si l'arc est "actif" (connecté à une place avec jetons ou transition activée)
            const sourceHasTokens = arc[0].startsWith('p') && (marking[arc[0]] || 0) > 0;
            const targetIsEnabled = arc[1].startsWith('t') && enabledTransitions.includes(arc[1]);
            const isActiveArc = sourceHasTokens || targetIsEnabled;
            
            return (
              <g key={`arc-${index}`}>
                {/* Ligne de fond pour l'effet */}
                <line
                  x1={arrowPos.x1}
                  y1={arrowPos.y1}
                  x2={arrowPos.x2}
                  y2={arrowPos.y2}
                  stroke={isActiveArc ? "#fbbf24" : "#64748b"}
                  strokeWidth={isActiveArc ? "4" : "3"}
                  opacity={isActiveArc ? "0.3" : "0.2"}
                />
                {/* Ligne principale */}
                <line
                  x1={arrowPos.x1}
                  y1={arrowPos.y1}
                  x2={arrowPos.x2}
                  y2={arrowPos.y2}
                  stroke={isActiveArc ? "#f59e0b" : "#475569"}
                  strokeWidth={isActiveArc ? "3" : "2"}
                  markerEnd={isActiveArc ? "url(#arrowheadActive)" : "url(#arrowhead)"}
                  opacity={isActiveArc ? "0.9" : "0.7"}
                  strokeDasharray={isActiveArc ? "8,4" : "none"}
                >
                  {isActiveArc && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </line>
              </g>
            );
          })}

          {/* Places améliorées */}
          {places.map((place) => {
            const pos = nodePositions[place.id];
            if (!pos) return null;
            
            const tokens = marking[place.id] || 0;
            const isResource = ['p12', 'p13', 'p14'].includes(place.id);
            const hasTokens = tokens > 0;
            
            return (
              <g key={`place-${place.id}`}>
                {/* Effet de lueur pour les places actives */}
                {hasTokens && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="35"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    opacity="0.4"
                  >
                    <animate
                      attributeName="r"
                      values="35;40;35"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.4;0.1;0.4"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                
                {/* Cercle principal de la place */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="28"
                  fill={
                    isResource 
                      ? "url(#resourceGradient)" 
                      : hasTokens 
                        ? "url(#placeActiveGradient)" 
                        : "url(#placeGradient)"
                  }
                  stroke={hasTokens ? "#d97706" : isResource ? "#059669" : "#2563eb"}
                  strokeWidth={hasTokens ? "3" : "2"}
                  filter="url(#shadow)"
                  style={{ cursor: isAnimated ? 'move' : 'default' }}
                  onMouseDown={handleMouseDown(place.id)}
                />
                
                {/* Cercle intérieur pour effet de profondeur */}
                <circle
                  cx={pos.x - 5}
                  cy={pos.y - 5}
                  r="8"
                  fill="rgba(255,255,255,0.4)"
                  pointerEvents="none"
                />
                
                {/* Label de la place avec arrière-plan */}
                <rect
                  x={pos.x - 35}
                  y={pos.y + 35}
                  width="70"
                  height="18"
                  rx="9"
                  fill="rgba(15, 23, 42, 0.8)"
                  stroke="rgba(148, 163, 184, 0.5)"
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.y + 47}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#e2e8f0"
                  pointerEvents="none"
                  fontFamily="Arial, sans-serif"
                >
                  {place.label.length > 9 ? place.label.substring(0, 9) + '...' : place.label}
                </text>
                
                {/* Jetons avec effet 3D */}
                {tokens > 0 && (
                  <g>
                    <circle
                      cx={pos.x}
                      cy={pos.y - 45}
                      r="12"
                      fill="url(#tokenGradient)"
                      stroke="#b91c1c"
                      strokeWidth="2"
                      filter="url(#shadow)"
                    />
                    <circle
                      cx={pos.x - 3}
                      cy={pos.y - 48}
                      r="3"
                      fill="rgba(255,255,255,0.7)"
                      pointerEvents="none"
                    />
                    <text
                      x={pos.x}
                      y={pos.y - 42}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="white"
                      pointerEvents="none"
                    >
                      {tokens}
                    </text>
                  </g>
                )}
                
                {/* Icône pour les ressources */}
                {isResource && (
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    fontSize="16"
                    pointerEvents="none"
                  >
                    {place.id === 'p12' ? '🥤' : place.id === 'p13' ? '☕' : '💧'}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Ajout du dégradé pour les jetons */}
          <defs>
            <radialGradient id="tokenGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fef2f2" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>
          </defs>

          {/* Transitions améliorées */}
          {transitions.map((transition) => {
            const pos = nodePositions[transition.id];
            if (!pos) return null;
            
            const isEnabled = enabledTransitions.includes(transition.id);
            
            return (
              <g key={`transition-${transition.id}`}>
                {/* Effet de pulsation pour les transitions activées */}
                {isEnabled && (
                  <rect
                    x={pos.x - 38}
                    y={pos.y - 18}
                    width="76"
                    height="36"
                    rx="8"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="stroke-width"
                      values="3;6;3"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.2;0.6"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                
                {/* Rectangle principal de la transition */}
                <rect
                  x={pos.x - 35}
                  y={pos.y - 15}
                  width="70"
                  height="30"
                  rx="6"
                  fill={isEnabled ? "url(#enabledGradient)" : "url(#transitionGradient)"}
                  stroke={isEnabled ? "#d97706" : "#4b5563"}
                  strokeWidth={isEnabled ? "3" : "2"}
                  filter="url(#shadow)"
                  style={{ cursor: isAnimated ? 'move' : 'pointer' }}
                  onMouseDown={isAnimated ? handleMouseDown(transition.id) : undefined}
                  onClick={!isAnimated ? () => onTransitionClick(transition.id) : undefined}
                  onMouseEnter={(e) => {
                    if (!isAnimated) {
                      e.currentTarget.setAttribute('stroke-width', isEnabled ? '4' : '3');
                      e.currentTarget.setAttribute('filter', 'url(#glow)');
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAnimated) {
                      e.currentTarget.setAttribute('stroke-width', isEnabled ? '3' : '2');
                      e.currentTarget.setAttribute('filter', 'url(#shadow)');
                    }
                  }}
                />
                
                {/* Barre de progression pour les transitions activées */}
                {isEnabled && (
                  <rect
                    x={pos.x - 32}
                    y={pos.y + 18}
                    width="64"
                    height="4"
                    rx="2"
                    fill="rgba(217, 119, 6, 0.3)"
                  >
                    <rect
                      x={pos.x - 32}
                      y={pos.y + 18}
                      width="0"
                      height="4"
                      rx="2"
                      fill="#d97706"
                    >
                      <animate
                        attributeName="width"
                        values="0;64;0"
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </rect>
                  </rect>
                )}
                
                {/* Éclat intérieur pour effet de profondeur */}
                <rect
                  x={pos.x - 30}
                  y={pos.y - 10}
                  width="25"
                  height="8"
                  rx="3"
                  fill="rgba(255,255,255,0.3)"
                  pointerEvents="none"
                />
                
                {/* Label de la transition avec arrière-plan */}
                <rect
                  x={pos.x - 40}
                  y={pos.y + 28}
                  width="80"
                  height="16"
                  rx="8"
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke={isEnabled ? "rgba(245, 158, 11, 0.5)" : "rgba(148, 163, 184, 0.3)"}
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.y + 38}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={isEnabled ? "#fbbf24" : "#cbd5e1"}
                  pointerEvents="none"
                  fontFamily="Arial, sans-serif"
                >
                  {transition.label.length > 11 ? transition.label.substring(0, 11) + '...' : transition.label}
                </text>
                
                {/* Indicateur d'état */}
                <circle
                  cx={pos.x + 25}
                  cy={pos.y - 8}
                  r="4"
                  fill={isEnabled ? "#10b981" : "#ef4444"}
                  stroke="white"
                  strokeWidth="1"
                >
                  {isEnabled && (
                    <animate
                      attributeName="r"
                      values="4;6;4"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg p-6 border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center">
          <span className="text-xl mr-2">📊</span>
          Légende & Guide d'utilisation
        </h4>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-slate-700 mb-3">Éléments du réseau :</h5>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-300 to-blue-600 mr-3 shadow-sm"></div>
                <span className="text-sm text-slate-600">Places (états du système)</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 mr-3 shadow-sm"></div>
                <span className="text-sm text-slate-600">Places actives (avec jetons)</span>
              </div>
              <div className="flex items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 mr-3 shadow-sm"></div>
                <span className="text-sm text-slate-600">Ressources (stock)</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-3 bg-gradient-to-r from-gray-300 to-gray-500 mr-3 rounded-sm shadow-sm"></div>
                <span className="text-sm text-slate-600">Transitions inactives</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-3 bg-gradient-to-r from-amber-400 to-amber-600 mr-3 rounded-sm shadow-sm animate-pulse"></div>
                <span className="text-sm text-slate-600">Transitions actives</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-semibold text-slate-700 mb-3">Interactions :</h5>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-red-500 font-bold mr-3 text-lg">●</span>
                <span className="text-sm text-slate-600">Jetons (marquage actuel)</span>
              </div>
              <div className="flex items-center">
                <span className="text-amber-500 mr-3">⚡</span>
                <span className="text-sm text-slate-600">Arcs actifs (flux de jetons)</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-3">🎯</span>
                <span className="text-sm text-slate-600">Indicateur d'état (vert = activé)</span>
              </div>
              <div className="flex items-center">
                <span className="text-blue-500 mr-3">🔄</span>
                <span className="text-sm text-slate-600">Animations de flux dynamiques</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="flex items-center text-sm">
            <span className="text-2xl mr-2">{isAnimated ? '🔄' : '🎯'}</span>
            <div>
              <p className="font-medium text-slate-700">
                {isAnimated 
                  ? "Mode déplacement activé" 
                  : "Mode interaction activé"
                }
              </p>
              <p className="text-slate-600">
                {isAnimated 
                  ? "Glissez-déposez les nœuds pour réorganiser le graphique" 
                  : "Cliquez sur les transitions orange pour déclencher les actions"
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Phase-based Layout</span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Real-time Animation</span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Interactive Simulation</span>
        </div>
      </div>
    </div>
  );
};

export default PetriNetGraph;
