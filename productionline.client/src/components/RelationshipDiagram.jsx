import React from "react";

const RelationshipDiagram = ({ selectedForms, forms, relationships, formFieldMappings }) => {
    if (selectedForms.length < 2 || relationships.length === 0) return null;

    const getFormName = (formId) => {
        return forms.find(f => f.id === formId)?.name || `Form ${formId}`;
    };

    // Build relationship graph
    const buildRelationshipGraph = () => {
        const graph = {};
        const formNodes = new Set(selectedForms);

        relationships.forEach(rel => {
            const sourceForm = rel.sourceFormId;
            const targetForm = rel.targetFormId;

            if (!graph[sourceForm]) graph[sourceForm] = [];
            if (!graph[targetForm]) graph[targetForm] = [];

            graph[sourceForm].push(targetForm);
            graph[targetForm].push(sourceForm);
            formNodes.add(sourceForm);
            formNodes.add(targetForm);
        });

        return { graph, formNodes: Array.from(formNodes) };
    };

    const { graph, formNodes } = buildRelationshipGraph();

    // Group connected forms into clusters
    const findConnectedClusters = () => {
        const visited = new Set();
        const clusters = [];

        formNodes.forEach(formId => {
            if (!visited.has(formId)) {
                const cluster = [];
                const stack = [formId];

                while (stack.length > 0) {
                    const current = stack.pop();
                    if (!visited.has(current)) {
                        visited.add(current);
                        cluster.push(current);
                        if (graph[current]) {
                            graph[current].forEach(neighbor => {
                                if (!visited.has(neighbor)) {
                                    stack.push(neighbor);
                                }
                            });
                        }
                    }
                }
                clusters.push(cluster);
            }
        });

        return clusters;
    };

    const clusters = findConnectedClusters();

    return (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Relationship Diagram
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {relationships.length} connection{relationships.length !== 1 ? 's' : ''}
                </span>
            </h3>

            <div className="space-y-8">
                {clusters.map((cluster, clusterIndex) => (
                    <div key={clusterIndex} className="flex items-center justify-center gap-6 p-6 bg-gray-50 rounded-lg">
                        {cluster.map((formId, nodeIndex) => {
                            const isConnected = graph[formId] && graph[formId].length > 0;
                            const connections = graph[formId]?.length || 0;

                            return (
                                <React.Fragment key={formId}>
                                    <div
                                        className={`p-6 border-4 rounded-xl shadow-lg transition-all duration-300 ${isConnected
                                                ? 'border-green-500 bg-green-50 shadow-green-200'
                                                : 'border-gray-300 bg-white shadow-md'
                                            }`}
                                    >
                                        <div className="text-2xl font-bold text-gray-800 mb-2">
                                            {getFormName(formId)}
                                        </div>
                                        <div className="text-sm text-gray-600 mb-3">
                                            ID: {formId}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-800 mb-1">
                                            {formFieldMappings[formId]?.selectedFields?.length || 0} fields
                                        </div>
                                        {isConnected && (
                                            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                {connections} connection{connections > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>

                                    {nodeIndex < cluster.length - 1 && (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-20 h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-sm"></div>
                                            <div className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm border">
                                                ↔ {relationships.find(r =>
                                                    (r.sourceFormId === cluster[nodeIndex] && r.targetFormId === cluster[nodeIndex + 1]) ||
                                                    (r.sourceFormId === cluster[nodeIndex + 1] && r.targetFormId === cluster[nodeIndex])
                                                )?.label || 'Linked'}
                                            </div>
                                            <div className="w-20 h-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-sm"></div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ))}

                {/* Show unconnected forms separately */}
                {formNodes.length < selectedForms.length && (
                    <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Unconnected Forms</h4>
                        <div className="flex flex-wrap gap-4">
                            {selectedForms.filter(id => !formNodes.includes(id)).map(formId => (
                                <div key={formId} className="p-4 border border-yellow-300 rounded-lg bg-yellow-50 text-sm">
                                    {getFormName(formId)} ({formFieldMappings[formId]?.selectedFields?.length || 0} fields)
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Relationship Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                    💡 Green nodes = Connected forms | Gray nodes = Standalone |
                    Arrows show actual relationships from your configuration
                </div>
            </div>
        </div>
    );
};

export default RelationshipDiagram;
