// Import necessary Node.js modules for file system and path manipulation
const fs = require("node:fs");
const path = require("node:path");

// Import external libraries for XML processing and MathML conversion
const xpath = require("xpath"); // Library for querying XML documents using XPath
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom"); // XML parser and serializer
const { MathMLToLaTeX } = require("mathml-to-latex"); // Library to convert MathML to LaTeX

// --- Path Setup ---
const here = __dirname; // Gets the directory where the script is located
// Assumes the repository root is one level up from the script's directory
const repoRoot = path.resolve(path.join(here, ".."));

/**
 * Reads a CNX collection XML file and parses it into an XML Document Object Model (DOM).
 * @param {string} collection - The filename of the collection XML.
 * @returns {Document} The parsed XML DOM object.
 */
function getCollection(collection = "calculus-volume-3.collection.xml") {
  // Construct the full path to the collection file: [repoRoot]/collections/[filename]
  const colPath = path.join(repoRoot, "collections", collection);
  // Read the XML file content synchronously
  const xml = fs.readFileSync(colPath, "utf-8");
  // Parse the XML content into a DOM object
  return new DOMParser().parseFromString(xml);
}

// --- XPath Setup ---
// Configure XPath to recognize and use namespaces found in CNX and MathML documents
const select = xpath.useNamespaces({
  col: "http://cnx.rice.edu/collxml", // For collection elements
  m: "http://www.w3.org/1998/Math/MathML", // For MathML elements
  c: "http://cnx.rice.edu/cnxml", // For CNXML elements (though not strictly needed for this script's queries)
});

// Load the default collection XML DOM
const col = getCollection();

// --- Module Discovery ---
// Select all 'document' attributes from 'module' elements within the collection
// These attributes contain the directory names for the actual module files
const modules = select("//col:module[@document]/@document", col);

// Map the list of module directory names to full file paths for the CNXML content
const modulePaths = modules.map((node) =>
  // The path is: [repoRoot]/modules/[module-name]/index.cnxml
  path.join(repoRoot, "modules", node.value, "index.cnxml"),
);

// --- Processing Modules ---
// Iterate over each discovered module file path
modulePaths.forEach((modulePath) => {
  const parser = new DOMParser(); // Initialize a new XML parser
  const serializer = new XMLSerializer(); // Initialize a new XML serializer

  // Read and parse the module's CNXML content
  const xml = fs.readFileSync(modulePath, "utf-8");
  const doc = parser.parseFromString(xml);

  // Use XPath to select all MathML root elements (m:math) in the document
  const mathNodes = select("//m:math", doc);

  // Iterate over each MathML node found
  mathNodes.forEach((mathNode) => {
    // 1. Serialize the MathML node back to an XML string
    let serialized = serializer.serializeToString(mathNode);

    // 2. Clean up the serialized MathML string for the converter
    // The 'mathml-to-latex' library expects a cleaner XML structure:
    // a. Remove the redundant namespace declaration: xmlns:m="..."
    serialized = serialized
      .replace('xmlns:m="http://www.w3.org/1998/Math/MathML"', "")
      // b. Remove the 'm:' prefix from all MathML tags (e.g., <m:mrow> becomes <mrow>)
      .replace(/<m\:/g, "<")
      .replace(/<\/m\:/g, "</");

    // 3. Convert the cleaned MathML string to LaTeX and print the result
    console.log(MathMLToLaTeX.convert(serialized));
  });
});
