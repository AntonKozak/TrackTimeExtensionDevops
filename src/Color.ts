﻿const allColors = ["0072C6", "4617B4", "8C0095", "008A17", "D24726", "008299", "AC193D", "DC4FAD", "FF8F32", "82BA00", "03B3B2", "5DB2FF"];
const currentIterationColor = "#C1E6FF"; /*Pattens Blue*/
const otherIterationColors = ["#FFDAC1", "#E6FFC1", "#FFC1E6"]; /*Negroni, Chiffon, Cotton Candy*/

// Specific category colors
const categoryColors: { [key: string]: string } = {
    prio: "#FF0000",
    important: "#FFA500",
    special: "#808080"
};

var interationCount = 0;

/**
 * Generates a color from the specified name
 * @param name String value used to generate a color
 * @return RGB color in the form of #RRGGBB
 */
export function generateColor(name: string): string {
    if (name === "currentIteration") {
        return currentIterationColor;
    }

    if (name === "otherIteration") {
        return otherIterationColors[interationCount++ % otherIterationColors.length];
    }

    // Check if category has a specific color defined
    const lowerCaseName = name.toLowerCase();
    if (categoryColors[lowerCaseName]) {
        return categoryColors[lowerCaseName];
    }

    const id = name.slice().toLowerCase();
    let value = 0;
    for (let i = 0; i < (id || "").length; i++) {
        value += id.charCodeAt(i) * (i + 1);
    }

    return "#" + allColors[value % allColors.length];
}
