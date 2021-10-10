class Mutate {
  //    [obj, boundto, boundby, typeofObj]
  static obj2table(obj, parentId = -1, key = "NA", table = []) {
    // combination of objects/arrays to 2d
    var thisid = table.length;
    table.push(["NA", parentId, key, operate.is(obj)]);

    if (operate.isArray(obj) || operate.isObject(obj)) {
      for (var key in obj) {
        Mutate.obj2table(obj[key], thisid, key, table);
      }
    } else {
      table[thisid][0] = obj;
    }
    return table;
  }
  static table2obj(tab, first = true) {
    var references = [];
    for (var i = 0; i < tab.length; i++) {
      if (tab[i][3] === "Object") {
        references[i] = {};
      } else if (tab[i][3] === "Array") {
        references[i] = [];
      } else references[i] = tab[i][0];
      if (tab[i][1] != -1) {
        references[tab[i][1]][tab[i][2]] = references[i];
      }
    }
    return references[0];
  }
}
