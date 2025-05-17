export const initializeDependentOptions = (parentOptions) => {
    const dependentOptions = {};
    parentOptions.forEach(option => {
        dependentOptions[option] = [];
    });
    return dependentOptions;
};

export const getDependentOptions = (columns, columnName, parentValue) => {
    const column = columns.find(col => col.name === columnName);
    if (!column || !column.dependentOptions || !parentValue) {
        return [];
    }
    return column.dependentOptions[parentValue] || [];
};