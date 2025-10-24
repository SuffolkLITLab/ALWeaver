import { useMemo } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { useBlockStore } from '../../store/useBlockStore';
import { deriveFlowElements } from '../../utils/yamlMapper';

export const FlowCanvas = () => {
  const blocks = useBlockStore((state) => state.blocks);
  const { nodes, edges } = useMemo(() => deriveFlowElements(blocks), [blocks]);

  return (
    <div className="h-80 rounded-xl border border-outline/30 overflow-hidden bg-panel/80">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          panOnScroll
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: true }}
          style={{ height: '100%' }}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
