export function compareMaps<Key, Val>(
    map1: ReadonlyMap<Key, Val>,
    map2: ReadonlyMap<Key, Val>,
    equals: (v1: Val, v2: Val) => boolean = (v1, v2) => Object.is(v1, v2)
  ): Map<Key, { a: Val; b: Val }> {
    const diff = new Map<Key, { a: Val; b: Val }>();

    const missingKeyInMap1: Key[] = []; // present in map2, missing in map1
    const missingKeyInMap2: Key[] = []; // present in map1, missing in map2

    
    for (const [key, aVal] of map1) {
      if (!map2.has(key)) {
        missingKeyInMap2.push(key);
        continue; 
      }

      const bVal = map2.get(key)!;
      if (!equals(aVal, bVal)) {
        diff.set(key, { a: aVal, b: bVal });
      }
    }

    for (const key of map2.keys()) {
      if (!map1.has(key)) {
        missingKeyInMap1.push(key);
      }
    }

    if (missingKeyInMap1.length > 0) {
      console.warn(
        `Keys present in map2 but missing in map1:`,
        missingKeyInMap1
      );
    }
    if (missingKeyInMap2.length > 0) {
      console.warn(
        `Keys present in map1 but missing in map2:`,
        missingKeyInMap2
      );
    }

    return diff;
  }