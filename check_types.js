const fs = require('fs');
const g = JSON.parse(fs.readFileSync('public/data/planner_graph.json'));

console.log('Type of adjacency key:', typeof Object.keys(g.adjacency)[0]);
console.log('Type of node key:', typeof Object.keys(g.nodes)[0]);
console.log('Sample edge.to type:', typeof g.adjacency['287'][0].to);
console.log('Checking if 287 === "287":', 287 === '287');
console.log('Checking if g.adjacency[287] exists:', !!g.adjacency[287]);
console.log('Checking if g.adjacency["287"] exists:', !!g.adjacency['287']);
