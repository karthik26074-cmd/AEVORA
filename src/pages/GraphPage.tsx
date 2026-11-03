import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  FileText,
  User,
  Scale,
  Sparkles,
  X,
  ArrowRight,
  GitCommit,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { KnowledgeGraphData, KnowledgeGraphNode, KnowledgeGraphEdge } from '../types';

export const GraphPage: React.FC = () => {
  const { currentWorkspace, records, features } = useWorkspace();

  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch graph data from backend
  useEffect(() => {
    if (!currentWorkspace) return;
    fetch(`/api/graph?workspaceId=${currentWorkspace.id}`)
      .then((r) => r.json())
      .then((data) => setGraphData(data))
      .catch((err) => console.error('Graph fetch error:', err));
  }, [currentWorkspace]);

  // Compute 2D node layout positions
  const nodePositions = React.useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const width = 850;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;

    const moduleNodes = graphData.nodes.filter((n) => n.type === 'module');
    const featureNodes = graphData.nodes.filter((n) => n.type === 'feature');
    const docNodes = graphData.nodes.filter((n) => n.type === 'document');
    const peopleNodes = graphData.nodes.filter((n) => n.type === 'person');
    const decisionNodes = graphData.nodes.filter((n) => n.type === 'decision');

    // 1. Center Modules in inner circle
    const modRadius = 140;
    moduleNodes.forEach((node, i) => {
      const angle = (i / Math.max(moduleNodes.length, 1)) * 2 * Math.PI;
      positions.set(node.id, {
        x: centerX + modRadius * Math.cos(angle),
        y: centerY + modRadius * Math.sin(angle),
      });
    });

    // 2. Features in middle circle
    const featRadius = 240;
    featureNodes.forEach((node, i) => {
      const angle = (i / Math.max(featureNodes.length, 1)) * 2 * Math.PI + 0.3;
      positions.set(node.id, {
        x: centerX + featRadius * Math.cos(angle),
        y: centerY + featRadius * Math.sin(angle),
      });
    });

    // 3. Documents on top perimeter
    docNodes.forEach((node, i) => {
      const angle = Math.PI + ((i - (docNodes.length - 1) / 2) / Math.max(docNodes.length, 1)) * 1.5;
      positions.set(node.id, {
        x: centerX + 340 * Math.cos(angle),
        y: centerY + 280 * Math.sin(angle),
      });
    });

    // 4. People on bottom perimeter
    peopleNodes.forEach((node, i) => {
      const angle = ((i - (peopleNodes.length - 1) / 2) / Math.max(peopleNodes.length, 1)) * 1.5;
      positions.set(node.id, {
        x: centerX + 340 * Math.cos(angle),
        y: centerY + 280 * Math.sin(angle),
      });
    });

    // 5. Decisions
    decisionNodes.forEach((node, i) => {
      positions.set(node.id, {
        x: centerX - 260 + i * 160,
        y: centerY - 180,
      });
    });

    return positions;
  }, [graphData]);

  // Filter nodes based on category and search
  const visibleNodes = graphData.nodes.filter((n) => {
    const matchesCat = selectedCategory === 'ALL' || n.type === selectedCategory;
    const matchesSearch = !search || n.label.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  const visibleEdges = graphData.edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  // Pan and drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Connected edges and neighbors for selected node
  const connectedEdges = selectedNode
    ? graphData.edges.filter(
        (e) => e.source === selectedNode.id || e.target === selectedNode.id
      )
    : [];

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'module':
        return '#7668F5'; // Violet
      case 'feature':
        return '#1C9B78'; // Teal
      case 'document':
        return '#4285F4'; // Blue
      case 'person':
        return '#D99B43'; // Amber
      case 'decision':
        return '#9185FA'; // Light violet
      default:
        return '#85899A';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Temporal Knowledge Graph
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Visual topology mapping features, modules, people, decisions, and original project evidence.
          </p>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Entities' },
            { id: 'feature', label: 'Features' },
            { id: 'module', label: 'Modules' },
            { id: 'document', label: 'Records' },
            { id: 'person', label: 'People' },
            { id: 'decision', label: 'Decisions' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-secondary hover:text-brand-dark dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="relative rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle overflow-hidden h-[620px]">
        {/* Floating Controls Bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-brand-surface/90 dark:bg-brand-dark-card/90 backdrop-blur-md p-1.5 rounded-2xl border border-brand-border dark:border-brand-dark-border shadow-card">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find node..."
              className="pl-8 pr-3 py-1 text-xs rounded-xl bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none w-36"
            />
          </div>

          <div className="h-4 w-px bg-brand-border dark:bg-brand-dark-border" />

          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
            className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
            className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg"
            title="Reset View"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 bg-brand-surface/90 dark:bg-brand-dark-card/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-brand-border dark:border-brand-dark-border text-[11px] shadow-card">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7668F5]" />
            <span className="text-brand-secondary">Module</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1C9B78]" />
            <span className="text-brand-secondary">Feature</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
            <span className="text-brand-secondary">Record</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D99B43]" />
            <span className="text-brand-secondary">Person</span>
          </div>
        </div>

        {/* SVG Interactive Graph Canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        >
          <svg className="w-full h-full">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {visibleEdges.map((edge) => {
                const sPos = nodePositions.get(edge.source);
                const tPos = nodePositions.get(edge.target);
                if (!sPos || !tPos) return null;

                const isConnectedToSelected =
                  selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

                return (
                  <g key={edge.id}>
                    <line
                      x1={sPos.x}
                      y1={sPos.y}
                      x2={tPos.x}
                      y2={tPos.y}
                      stroke={isConnectedToSelected ? '#7668F5' : '#D1D5E5'}
                      strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                      strokeDasharray={edge.label === 'mentions' || edge.label === 'depends_on' ? '3 3' : undefined}
                      opacity={selectedNode && !isConnectedToSelected ? 0.25 : 0.75}
                    />
                    {/* Edge Label on hover / selection */}
                    {isConnectedToSelected && (
                      <text
                        x={(sPos.x + tPos.x) / 2}
                        y={(sPos.y + tPos.y) / 2 - 4}
                        textAnchor="middle"
                        fill="#7668F5"
                        fontSize={9}
                        fontWeight="bold"
                        className="pointer-events-none font-mono"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {visibleNodes.map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNode?.id === node.id;
                const nodeColor = getNodeColor(node.type);
                const radius = node.type === 'module' ? 24 : node.type === 'feature' ? 20 : 16;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Pulse or highlight ring */}
                    {isSelected && (
                      <circle
                        r={radius + 8}
                        fill="none"
                        stroke={nodeColor}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        className="animate-spin"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      r={radius}
                      fill={nodeColor}
                      stroke="#FFFFFF"
                      strokeWidth={2.5}
                      className="transition-transform group-hover:scale-110 shadow-sm"
                    />

                    {/* Node Text Label */}
                    <text
                      y={radius + 14}
                      textAnchor="middle"
                      fill="#24263A"
                      fontSize={11}
                      fontWeight="bold"
                      className="pointer-events-none fill-brand-dark dark:fill-white font-sans"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bottom-4 w-80 bg-brand-surface/95 dark:bg-brand-dark-card/95 backdrop-blur-md rounded-2xl shadow-elevated border border-brand-border dark:border-brand-dark-border p-5 z-20 flex flex-col overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border dark:border-brand-dark-border">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  backgroundColor: `${getNodeColor(selectedNode.type)}20`,
                  color: getNodeColor(selectedNode.type),
                }}
              >
                {selectedNode.type}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              <div>
                <h3 className="font-extrabold text-base text-brand-dark dark:text-white">
                  {selectedNode.label}
                </h3>
                <p className="text-[11px] text-brand-secondary font-mono mt-0.5">
                  ID: {selectedNode.id}
                </p>
              </div>

              {selectedNode.status && (
                <div className="p-2.5 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border/60">
                  <span className="text-[10px] text-brand-secondary uppercase font-semibold">
                    Current Status
                  </span>
                  <p className="font-bold text-brand-dark dark:text-white mt-0.5">
                    {selectedNode.status}
                  </p>
                </div>
              )}

              {/* Connected Relationships */}
              <div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-brand-secondary mb-2">
                  Connected Entities ({connectedEdges.length})
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {connectedEdges.map((ed) => {
                    const otherId = ed.source === selectedNode.id ? ed.target : ed.source;
                    const otherNode = graphData.nodes.find((n) => n.id === otherId);
                    return (
                      <div
                        key={ed.id}
                        onClick={() => otherNode && setSelectedNode(otherNode)}
                        className="p-2 rounded-xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border/60 hover:border-brand-primary cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-brand-dark dark:text-white truncate max-w-[140px]">
                          {otherNode?.label || otherId}
                        </span>
                        <span className="text-[10px] font-mono text-brand-primary">
                          {ed.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="w-full py-2 rounded-xl bg-brand-primary text-white text-xs font-bold mt-2"
            >
              Close Panel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
