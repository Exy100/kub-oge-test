import processorLab from './processor-lab.js';
import turtle from './turtle.js';
import dreamers from './dreamers.js';
import threeArches from './three-arches.js';
import dataForge from './data-forge.js';
import discoveryGarden from './discovery-garden.js';
import { catalog } from '../catalog/index.js';
import { deepFreeze } from '../catalog/registry.js';
import { validateLocations } from './validate.js';

// Preserve route order; runtime progress is created separately in progression.js.
export const LOCATIONS = deepFreeze([dreamers, turtle, processorLab, threeArches, dataForge, discoveryGarden]);
validateLocations(LOCATIONS, catalog);
