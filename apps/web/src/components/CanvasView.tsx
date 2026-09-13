import { ArrowRight } from 'lucide-react';
import type { NodePosition } from '../model/types';
import { canvasViewText } from '../constants/nodes';
import style from '../App.module.scss';
import { useMemo, useState, useCallback } from 'react';
import { ReactFlow, Background, MiniMap, BackgroundVariant } from '@xyflow/react';
import type {
  NodeChange,
  EdgeChange,
  Connection,
  IsValidConnection,
  OnMove,
  GetMiniMapNodeAttribute,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { canvas } from '../model/canvas';
import { validConnection } from '../model/graph';
import { nodeTypes } from './nodes';
import type { FlowNode } from './nodes';
import { ZoomControls } from './ZoomControls';
import { EdgeActions } from './EdgeActions';
import { useViewportInertia } from '../hooks/useViewportInertia';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { MOBILE_QUERY } from '../constants/mobile';
import type { GraphData } from '@canvas/contracts';

/** Содержимое графа для отображения в React Flow. */
export type CanvasViewProps = {
  /** Ноды, связи и сохранённое положение камеры. */
  graph: GraphData;
};

const minimapStyle = { width: 135, height: 85 };

/** Связывает React Flow с моделью, отделяя выделение и служебные поля от графа. */
export const CanvasView = ({ graph }: CanvasViewProps) => {
  const inertia = useViewportInertia();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [selected, setSelected] = useState(new Set<string>());

  const selectedEdges = useMemo(
    () => new Set(graph.edges.filter((edge) => selected.has(edge.id)).map((edge) => edge.id)),
    [graph.edges, selected],
  );

  const nodes = useMemo(
    () => graph.nodes.map((node) => (selected.has(node.id) ? { ...node, selected: true } : node)),
    [graph.nodes, selected],
  );

  const edges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        ...edge,
        selected: selected.has(edge.id),
        type: 'smoothstep',
        interactionWidth: 30,
        style: {
          stroke: selected.has(edge.id) ? '#7864bb' : '#8b97ac',
          strokeWidth: selected.has(edge.id) ? 3 : 1.6,
        },
      })),
    [graph.edges, selected],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      const positions = new Map<string, NodePosition>(),
        removed = new Set<string>();

      let selection: Set<string> | undefined;

      for (const change of changes) {
        if (change.type === 'position' && change.position)
          positions.set(change.id, change.position);
        else if (change.type === 'remove') removed.add(change.id);
        else if (change.type === 'select') {
          selection ??= new Set(selected);

          if (change.selected) selection.add(change.id);
          else selection.delete(change.id);
        }
      }

      if (removed.size) canvas.remove(removed);

      if (positions.size) canvas.positions(positions);

      if (selection) setSelected(selection);
    },
    [selected],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = new Set<string>();
      let selection: Set<string> | undefined;

      for (const change of changes) {
        if (change.type === 'remove') removed.add(change.id);
        else if (change.type === 'select') {
          selection ??= new Set(selected);

          if (change.selected) selection.add(change.id);
          else selection.delete(change.id);
        }
      }

      if (removed.size) canvas.removeEdges(removed);

      if (selection) setSelected(selection);
    },
    [selected],
  );

  const onConnect = useCallback((connection: Connection) => {
    canvas.connect(connection.source, connection.target);
  }, []);

  const deleteSelectedEdges = () => {
    canvas.removeEdges(selectedEdges);
    setSelected(new Set([...selected].filter((id) => !selectedEdges.has(id))));
  };

  const isConnectionAllowed: IsValidConnection = (connection) =>
    graph.edges.length < 20 && validConnection(canvas.index, connection.source, connection.target);

  const handleMove: OnMove = (event, viewport) => {
    inertia.onMove(event, viewport);
    canvas.viewport(viewport);
  };

  const getMinimapNodeColor: GetMiniMapNodeAttribute = (node) =>
    node.type === 'generator' ? '#7b81d4' : node.type === 'prompt' ? '#c6baa8' : '#a9bea9';

  return (
    <ReactFlow<FlowNode>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStart={canvas.endHistoryGroup}
      onNodeDragStop={canvas.endHistoryGroup}
      onSelectionDragStart={canvas.endHistoryGroup}
      onSelectionDragStop={canvas.endHistoryGroup}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isConnectionAllowed}
      defaultViewport={graph.viewport}
      onInit={inertia.onInit}
      onMoveStart={inertia.onMoveStart}
      onMove={handleMove}
      onMoveEnd={inertia.onMoveEnd}
      minZoom={0.1}
      maxZoom={4}
      nodeExtent={[
        [-10000, -10000],
        [10000, 10000],
      ]}
      deleteKeyCode={['Backspace', 'Delete']}
      fitView={mobile}
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      aria-label={canvasViewText.editor}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d3d7e0" />
      <ZoomControls hasNodes={nodes.length > 0} />
      <EdgeActions count={selectedEdges.size} onDelete={deleteSelectedEdges} />
      <MiniMap
        className={style.minimap}
        style={minimapStyle}
        nodeColor={getMinimapNodeColor}
        pannable
        zoomable
      />
      {!selectedEdges.size && (
        <div className={style.canvasCaption}>
          <span>{canvasViewText.prompt}</span>
          <span>
            <ArrowRight size={12} aria-hidden="true" />
          </span>
          <span>{canvasViewText.generator}</span>
          <span>
            <ArrowRight size={12} aria-hidden="true" />
          </span>
          <span>{canvasViewText.result}</span>
        </div>
      )}
    </ReactFlow>
  );
};
