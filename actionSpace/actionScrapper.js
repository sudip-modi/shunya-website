var counter = 0;

class Entity {
  static get(key, parent) {
    var keys;

    if (operate.isArray(key)) keys = key;
    else keys = Entity.stringToPath(key);
    var hold = parent;

    var l = { keys: keys, hold: hold };

    Entity.walk(
      { rngstart: 0, rngend: keys.length },
      {
        value: {
          func: function (i, l) {
            var key = l.keys[i];
            if (!l.hold) return false;
            l.hold = l.hold[key];
            return false;
          },
          args: [l],
        },
      }
    );

    if (l.hold) {
      return l.hold;
    } else {
      return key;
    }
  }
  static getValue(str, l, x) {
    if (operate.isString(str) && str.charAt(0) == "$") {
      // console.log(str, l, x);
      return eval(str.substr(1));
    }
    return x !== undefined ? x : str;
  }
  static setObjKeyVal(obj, key, val) {
    obj[key] = val;
  }
  static uniqueId(obj) {
    if (obj === window) return "window";
    if (obj === document) return "document";
    if (!obj.__uniqueId && !obj.hasAttribute("data-__uniqueId")) {
      obj.__uniqueId = counter;
      obj.setAttribute("data-__uniqueId", counter++);
    }
    return obj.__uniqueId || obj.getAttribute("data-__uniqueId");
  }
  static requestExpander(request) {
    if (request == null) return;

    if (operate.isString(request)) {
      request = window[request];
    }

    if (!operate.isObject(request)) {
      console.error(request, " is not a valid Object");
      throw Error("Terminate Called");
    }

    var rclone = { ...request };
    var parent = null;

    if (request.hasOwnProperty("extends")) {
      var parent = Entity.requestExpander(window[request["extends"]]); // parent is a JSON request

      request = { ...parent };
      delete request["extends"];

      var del = rclone.delete;
      delete rclone.delete;

      request = Entity.extends(rclone, request, del);

      delete request["extends"];
    }
    return request;
  }
  static complexRequestExpander(requestArr, maxDebugDepth = 10, depth = 0) {
    if (requestArr == null) return;

    if (operate.isString(requestArr)) {
      requestArr = window[requestArr];
    }

    if (depth > maxDebugDepth) {
      console.warn("Will not expand when depth > ", maxDebugDepth);
      return resultArr;
    }

    if (operate.isObject(requestArr)) {
      requestArr = [requestArr];
    } else if (!operate.isArray(requestArr)) {
      console.error(requestArr, " is not a valid Object or Array");
      throw Error("Terminate Called");
    }
    var resultArr = [];

    Entity.walk(
      { rngstart: 0, rngend: requestArr.length },
      {
        value: {
          func: function (i, requestArr, resultArr) {
            var request = requestArr[i];

            //single request
            // console.log(request);
            var rclone = Entity.copy(request);
            var parent = null;

            if (request.hasOwnProperty("extends")) {
              var parent = Entity.complexRequestExpander(
                window[request["extends"]],
                depth
              ); // parent is a JSON request

              request = Entity.copy(parent);

              var del = rclone.delete;
              delete rclone.delete;

              request = Entity.extends(rclone, request, del);

              delete request["extends"];
            }

            if (request.hasOwnProperty("callback")) {
              request.callback = Entity.complexRequestExpander(
                request.callback,
                depth + 1
              );
            }

            resultArr.push(request);
          },
          args: [requestArr, resultArr],
        },
      }
    );
    if (resultArr.length == 1) {
      return resultArr[0];
    }
    return resultArr;
  }
  // static get2(path, l) {

  //     var start = 0, inside = false;
  //     var parent = l;
  //     function get2Simple(key){
  //         if(it has a .)
  //     }

  //     for(var i=0;i<path.length;i++){
  //         var ch = path.charAt(i);

  //         if((ch == '[' || ch == '.') && !inside){
  //             //get Ready we have to do something
  //             key = '';
  //             inside = true;
  //         } else if(ch == '\'' || ch == '\"'){
  //             continue;
  //         } else if( ch == ']'){
  //             inside = false;
  //             parent = parent[get2(key)];
  //         } else if( path[i] == '.'){
  //             inside = true;
  //             parent = parent[get2(key)];
  //             key='';
  //         } else
  //             key += ch;
  //         if(key != ''){
  //             parent = parent[key];
  //         }
  //     }
  //     return parent;
  // }
  static stringToPath(path) {
    // If the path isn't a string, return it
    if (typeof path !== "string") return path;
    // // Create new array
    var output = [];
    //
    // // Split to an array with dot notation
    // path.split('.').forEach(function (item, index) {
    //
    //     // Split to an array with bracket notation
    //     item.split(/\[([^}]+)\]/g).forEach(function (key) {
    //
    //         // Push to the new array
    //         if (key.length > 0) {
    //             output.push(key);
    //         }
    //
    //     });
    //
    // });
    var debug;
    // if(path === "attributes.$all.$into-parent.$only-object.$follow-HTMLAttributeSchema")debug = true;

    var dt = { '"': 1, "'": 1 };
    var dn = ["]", ")", "}"];
    var dp = ["[", "(", "{"];
    var ds = ["."];
    var lastdepth = 0,
      depth = 0;

    var key = "";

    for (var i = 0; i < path.length; i++) {
      var x = path.charAt(i);

      if (Object.keys(dt).indexOf(x) >= 0) {
        depth += dt[x];
        if (dt[x] === 1) dt[x] = -1;
        else dt[x] = 1;
      } else if (dp.indexOf(x) >= 0) {
        depth += 1;
      } else if (dn.indexOf(x) >= 0) {
        depth -= 1;
      }
      if (ds.indexOf(x) >= 0) {
        if (depth === 0) {
          if (key.trim() !== "") {
            output.push(key.trim());
            key = "";
          } else key += x;
        } else key += x;
      } else if (lastdepth >= 0) {
        key += x;
      }
      // if(debug)console.log(x, depth, lastdepth);
      lastdepth = depth;
    }
    if (key.trim() !== "") {
      output.push(key.trim());
    }
    // console.log(path, output)
    return output;
  }
  static equalizeArraysInDelete(req, del) {
    //Fixing function
    var l = { req: req };
    var callback = {
      object: {
        func: function (del, key, l) {
          var clone = l.req;

          l.req = l.req[key];
          Entity.walk(del[key], l.callback);
          l.req = clone;

          return false;
        },
        args: [l],
      },
      array: {
        func: function (del, key, l) {
          while (del[key].length < l.req[key].length) {
            del[key].push(null);
          }
          var clone = l.req;

          l.req = l.req[key];
          Entity.walk(del[key], l.callback);
          l.req = clone;

          return false;
        },
        args: [l],
      },
    };
    l.callback = callback;
    Entity.walk(del, callback);

    return del;
  }
  static deleteProps(req, del) {
    // console.log(del);
    del = Entity.equalizeArraysInDelete(req, del);
    // console.log(del);
    var l = { req: req };

    var callback = {
      // iterating over del
      value: {
        func: function (obj, key, l) {
          // console.log(l.tmp);
          if (l.tmp) {
            // is not null
            if (obj[key]) {
              // ignore this
              return;
            } else {
              // add this to the array
              l.tmp.push(l.req[key]);
            }
          } else if (obj[key])
            // is not null
            delete l.req[key];

          return false;
        },
        args: [l],
      },
      array: {
        func: function (obj, key, l) {
          var clone = l.req;
          var clonetmp = l.tmp || null;

          l.tmp = [];
          l.req = l.req[key];
          Entity.walk(obj[key], l.callback);
          l.req = clone;

          var anstmp = l.tmp;

          if (clonetmp) clonetmp.push(anstmp);
          else l.req[key] = anstmp;

          l.tmp = clonetmp;

          return false;
        },
        args: [l],
      },
      object: {
        func: function (obj, key, l) {
          var clone = l.req;
          var clonetmp = l.tmp || null;

          l.tmp = null;

          l.req = l.req[key];
          Entity.walk(obj[key], l.callback);
          l.req = clone;

          if (clonetmp) clonetmp.push(l.req[key]);
          // else
          //     l.req[key] = l.req[key]; //lol

          l.tmp = clonetmp;

          return false;
        },
        args: [l],
      },
    };
    l.callback = callback;

    Entity.walk(del, callback);

    return l.req;
  }
  static setProps(req, model, ALLSTATES = {}) {
    for (var key in req) {
      // console.log(ALLSTATES, key, req[key]);
      var subkeys = Entity.stringToPath(key);
      var parent = ALLSTATES;
      for (var i = 0; i < subkeys.length - 1; i++) {
        // console.log(parent);
        parent = parent[subkeys[i]];
      }
      // console.log("SETPROPS", parent, subkeys[subkeys.length-1], req[key]);
      parent[subkeys[subkeys.length - 1]] = Entity.updateProps(
        req[key],
        null,
        ALLSTATES,
        true
      );
    }
  }
  static updateProps(req, model, ALLSTATES = {}, parse = true) {
    if (operate.trueTypeOf(req) != operate.trueTypeOf(model) || !req) {
      if (operate.isArray(req) && !operate.isArray(model)) model = [];
      else if (operate.isObject(req) && !operate.isObject(model)) model = {};
      else return (model = Entity.getValue(req, ALLSTATES));
    }

    var l = { model: model };

    var callback = {
      array: {
        func: function (obj, key, l) {
          l.model[key] = l.model[key] || [];
          var clone = l.model;

          l.model = l.model[key];
          Entity.walk(obj[key], l.callback);
          l.model = clone;

          return false;
        },
        args: [l],
      },
      object: {
        func: function (obj, key, l) {
          l.model[key] = l.model[key] || {};
          var clone = l.model;

          l.model = l.model[key];
          Entity.walk(obj[key], l.callback);
          l.model = clone;

          return false;
        },
        args: [l],
      },
      value: {
        func: function (obj, key, l, ALLSTATES, parse) {
          if (parse) l.model[key] = Entity.getValue(obj[key], ALLSTATES);
          else l.model[key] = obj[key];

          // console.log(l.model, key, l.model[key], obj[key]);
          return false;
        },
        args: [l, ALLSTATES, parse],
      },
    };
    l.callback = callback;
    Entity.walk(req, callback, ALLSTATES);

    return l.model;
  }
  static extends(req, model, del) {
    model = { ...model };
    if (del) model = Entity.deleteProps(model, del);
    model = Entity.updateProps(req, model, {}, false);

    return model;
  }
  static async walk(
    req,
    callback,
    ALLSTATES = {},
    maxdepth = Infinity,
    depth = 0
  ) {
    // it goes for depth first

    if (depth > maxdepth) return;

    var emp = function () {};

    if (!callback.value) callback.value = {};
    if (!callback.value.func) callback.value.func = emp;
    if (!callback.value.args) callback.value.args = [];

    if (!callback.l) callback.l = {};

    var rtype = operate.trueTypeOf(req);

    if (rtype === "object" && req.hasOwnProperty("rngstart")) {
      if (!req.delta) {
        req.delta = 1;
      }
      // console.log(callback.value.func, req.rngstart, req.rngend);
      for (var i = req.rngstart; i != req.rngend; i += req.delta) {
        callback.l.args = [i, ...callback.value.args];

        if (operate.isFunction(callback["value"].func)) {
          if (callback["value"].wait) {
            if (await callback["value"].func(...callback.l.args))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          } else if (callback["value"].func(...callback.l.args))
            await Entity.walk(req[i], callback, ALLSTATES, maxdepth, depth + 1);
        } else {
          if (callback["value"].wait) {
            if (await engine.processRequest(callback["value"].func, callback.l))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          } else if (engine.processRequest(callback["value"].func, callback.l))
            await Entity.walk(req[i], callback, ALLSTATES, maxdepth, depth + 1);
        }
      }
    } else if (rtype === "array") {
      for (var i = 0; i < req.length; i++) {
        var type = operate.trueTypeOf(req[i]);
        if (callback.hasOwnProperty(type)) {
          callback.l.args = [req, i, ...callback[type].args];

          if (operate.isFunction(callback[type].func)) {
            if (callback[type].wait) {
              if (await callback[type].func(...callback.l.args))
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (callback[type].func(...callback.l.args))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          } else {
            if (callback[type].wait) {
              if (await engine.processRequest(callback[type].func, callback.l))
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (engine.processRequest(callback[type].func, callback.l))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          }
        } else {
          callback.l.args = [req, i, ...callback["value"].args];

          if (operate.isFunction(callback["value"].func)) {
            if (callback["value"].wait) {
              if (await callback["value"].func(...callback.l.args))
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (callback["value"].func(...callback.l.args))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          } else {
            if (callback["value"].wait) {
              if (
                await engine.processRequest(callback["value"].func, callback.l)
              )
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (
              engine.processRequest(callback["value"].func, callback.l)
            )
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          }
        }
      }
    } else if (rtype === "object") {
      for (var i in req) {
        // var x = i;
        // i = Entity.getValue(i, ALLSTATES);

        // if(x!=i)console.log("x, i:", x, i, ALLSTATES);

        var type = operate.trueTypeOf(req[i]);
        if (callback.hasOwnProperty(type)) {
          callback.l.args = [req, i, ...callback[type].args];

          if (operate.isFunction(callback[type].func)) {
            if (callback[type].wait) {
              if (await callback[type].func(...callback.l.args))
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (callback[type].func(...callback.l.args)) {
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
            }
          } else {
            if (callback[type].wait) {
              if (await engine.processRequest(callback[type].func, callback.l))
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (engine.processRequest(callback[type].func, callback.l))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          }
        } else {
          callback.l.args = [req, i, ...callback["value"].args];

          if (operate.isFunction(callback["value"].func)) {
            if (callback["value"].wait) {
              if (await callback["value"].func(...callback.l.args))
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (callback["value"].func(...callback.l.args))
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          } else {
            if (callback["value"].wait) {
              if (
                await engine.processRequest(callback["value"].func, callback.l)
              )
                await Entity.walk(
                  req[i],
                  callback,
                  ALLSTATES,
                  maxdepth,
                  depth + 1
                );
            } else if (
              engine.processRequest(callback["value"].func, callback.l)
            )
              await Entity.walk(
                req[i],
                callback,
                ALLSTATES,
                maxdepth,
                depth + 1
              );
          }
        }
      }
    } else {
      console.warn("req should be an object/array.What's this? ", req);
      return;
    }
  }
}
window.Entity = Entity;

async function copyAs(input, model) {
  input = await copyAsUtil(input, model);
  // var index = 0;
  // var cb = {};
  // //okay, so there are no arrays
  // var pass = {
  //    func: async function(obj, key, cb, index){
  //      var nk = key;
  //
  //      if(operate.isString(key)){
  //        nk = key.replaceAll("\"__INDEX\"", index);
  //      }
  //      obj[nk] = obj[key];
  //      if(nk!=key) delete obj[key];
  //      await Entity.walk(obj[nk], cb);
  //      return false;
  //    },
  //    args:[cb, index],
  //    wait:true
  // };
  // cb.object = pass;
  // cb.array = pass;
  // cb.value = {
  //   func:function(obj, key, index){
  //     var nk = key;
  //
  //     obj[nk] = obj[key];
  //     if(nk!=key)delete obj[key];
  //   },
  //   args:[index],
  //   wait:true
  // };
  // await Entity.walk(input, cb);
  return input;
}
async function copyAsUtil(input, model) {
  if (!(input instanceof Object && !operate.isFunction(input))) {
    console.error("Invalid input", input);
    return;
  }
  if (!operate.isObject(model)) {
    console.error("Invalid model", model);
    return;
  }

  model = JSON.parse(JSON.stringify(model));
  // console.log(model);
  var cb = {};
  var pass = {
    func: async function (obj, key, input, cb) {
      var nk = key;
      // console.log(obj, key);
      if (nk.charAt(0) == "~") {
        nk = nk.substr(1);
        nk = await matchObject(input, nk);
        // console.log(nk);
      }
      obj[nk] = obj[key];
      if (nk != key) delete obj[key];

      await Entity.walk(obj[nk], cb);
      return false;
    },
    args: [input, cb],
    wait: true,
  };
  cb.array = pass;
  cb.object = pass;
  cb.value = {
    func: async function (obj, key, input) {
      var nk = key;
      // console.log(obj, key);
      if (nk.charAt(0) == "~") {
        nk = nk.substr(1);
        nk = await matchObject(input, nk);
      }
      var x = await matchObject(input, obj[key]);
      // if(x) console.log(input, obj, key, nk, x);
      delete obj[key];
      if (x !== undefined) {
        obj[nk] = x;
        // if(operate.hasOwnProperty('length')){
        //   for(var xk in x){
        //     obj[key+"#"+xk] = x[xk];
        //   }
        //   delete obj[key];
        // }
      }
    },
    args: [input],
    wait: true,
  };

  await Entity.walk(model, cb);
  // if(model.items)
  // console.log(JSON.parse(JSON.stringify(model.items))) ;
  return model;
}
async function matchObject(obj, path, result, specific, pkey, lkey) {
  if (!result) result = { length: 0 };
  if (!specific) specific = { specific: true };
  // console.log(path);

  var keys;
  if (operate.isString(path)) {
    keys = await Entity.stringToPath(path);
    keys = await keys.reverse();
  } else {
    keys = path;
  }
  // console.log(keys);

  if (keys.length == 0) {
    if (pkey !== undefined) {
      await Entity.updateProps(obj, result);
      delete result["length"];
    } else if (lkey !== undefined) {
      result[lkey] = obj;
      delete result["length"];
    } else result[result.length++] = obj;
    return result;
  }

  var key = keys.pop();
  // console.log(key);
  if (key.charAt(0) == "$") {
    specific.specific2 = false;
    if (key == "$empty") {
      if (
        (operate.isArray(obj) && obj.length == 0) ||
        (obj instanceof Object &&
          !operate.isFunction(obj) &&
          Object.keys(obj).length === 0) ||
        obj === ""
      )
        await matchObject(obj, [...keys], result, specific, pkey, lkey);
    } else if (key == "$non-empty") {
      if (
        !(
          (operate.isArray(obj) && obj.length == 0) ||
          (obj instanceof Object &&
            !operate.isFunction(obj) &&
            Object.keys(obj).length === 0) ||
          obj === ""
        )
      ) {
        await matchObject(obj, [...keys], result, specific, pkey, lkey);
        // console.log(obj);
      }
    } else if (key == "$all") {
      for (var key in obj) {
        // console.log("waiting for ", obj[key], [...keys]);
        var x = await matchObject(
          obj[key],
          [...keys],
          result,
          specific,
          pkey,
          lkey
        );
        // console.log("completed ", obj[key], keys, JSON.parse(JSON.stringify(result)));
      }
    } else if (key == "$all-with-keys") {
      // console.log(obj);
      for (var key in obj) {
        var x = await matchObject(
          obj[key],
          [...keys],
          result,
          specific,
          pkey,
          key
        );
      }
    } else if (key == "$into-parent") {
      // console.log("here", obj);
      // for(var key in obj){

      var x = await matchObject(obj, [...keys], result, specific, true, lkey);

      // }
    } else if (key == "$only-object") {
      // console.log("here", obj);
      if (obj instanceof Object && !operate.isFunction(obj)) {
        // console.log(obj, key);
        await matchObject(obj, [...keys], result, specific, pkey, lkey);
      }
    } else if (key == "$only-array") {
      if (operate.isArray(obj)) {
        await matchObject(obj, [...keys], result, specific, pkey, lkey);
      }
    } else if (key == "$only-string") {
      // console.log('here', obj)
      if (operate.isString(obj)) {
        await matchObject(obj, [...keys], result, specific, pkey, lkey);
      }
    } else if (key == "$only-html") {
      if (operate.isHTML(obj)) {
        await matchObject(obj, [...keys], result, specific, pkey, lkey);
      }
    } else if (key.substr(0, "$follow-".length) == "$follow-") {
      //provides index property

      var x = await copyAsUtil(obj, window[key.substr("$follow-".length)]);
      // var delta  = 0;
      // if(result.hasOwnProperty("length")) del1ta = -1;
      // var index = Object.keys(result).length+delta;
      // var cb = {};
      // var pass = {
      //    func: async function(obj, key, cb, index){
      //      var nk = key;
      //
      //      if(operate.isString(key))
      //        nk = key.replaceAll("\"__INDEX\"", index);
      //
      //      obj[nk] = obj[key];
      //      if(nk!=key) delete obj[key];
      //      await Entity.walk(obj[nk], cb);
      //      return false;
      //    },
      //    args:[cb, index],
      //    wait:true
      // };
      // cb.object = pass;
      // cb.array = pass;
      // cb.value = {
      //   func:function(obj, key, index){
      //     var nk = key;
      //     if(operate.isString(obj[key])){
      //       obj[key] = obj[key].replaceAll("\"__INDEX\"", index);
      //
      //     }
      //     if(operate.isString(key)){
      //       nk = key.replaceAll("\"__INDEX\"", index);
      //     }
      //     obj[nk] = obj[key];
      //     if(nk!=key)delete obj[key];
      //   },
      //   args:[index],
      //   wait:true
      // };

      // await Entity.walk(x , cb);

      if (lkey !== undefined) {
        result[lkey] = x;
        delete result["length"];
      } else if (pkey === undefined) result[result.length++] = x;
      else {
        await Entity.updateProps(x, result);
        delete result["length"];
      }
      // console.log("pkeycheck", pkey, x, result, result[0]);
    } else if (key.substr(0, "$condition-".length) == "$condition-") {
      specific.specific2 = true;
      var condition = key.substr("$condition-".length);

      // console.log(obj, condition)
      var val = "";
      var exp = "";
      var insidestring = false;
      for (var i = 0; i < condition.length; i++) {
        var x = condition.charAt(i);
        if (x === "'" || x === '"') {
          insidestring = !insidestring;
          val += x;
          if (val.length > 1) {
            exp += val;
            val = "";
          }
        } else if (
          insidestring ||
          x === "_" ||
          x === "." ||
          x === "$" ||
          x === "-" ||
          operate.isAlphaNumeric(x)
        ) {
          val += x;
        } else {
          if (val != "") {
            if (val === "__INDEX") {
              exp += '"' + operate.escapeString('"__INDEX"') + '"';
            } else if (val === "undefined") {
              exp += "undefined";
            } else if (val.charAt(0) === "'" || val.charAt(0) === '"') {
              exp += val;
            } else {
              var res = await matchObject(obj, val);
              if (res === undefined) {
                exp += "undefined";
              } else if (!operate.isString(res)) {
                exp += JSON.stringify(res);
              } else {
                res = operate.escapeString(res);
                exp += '"' + res + '"';
              }
            }
            val = "";
          }
          exp += x;
        }
      }
      if (val != "") {
        if (val === "__INDEX") {
          exp += '"' + operate.escapeString('"__INDEX"') + '"';
        } else if (val === "undefined") {
          exp += "undefined";
        } else if (val.charAt(0) === "'" || val.charAt(0) === '"') {
          exp += val;
        } else {
          var res = await matchObject(obj, val);
          if (res === undefined) {
            exp += "undefined";
          } else if (!operate.isString(res)) {
            exp += JSON.stringify(res);
          } else {
            res = operate.escapeString(res);
            exp += '"' + res + '"';
          }
        }
        val = "";
      }
      // console.log(obj, condition, exp);
      // console.log(exp);
      exp = await Entity.getValue("$" + exp);

      await matchObject(exp, [...keys], result, specific, pkey, lkey);
    } else {
      //the heck
    }
    if (specific.specific2 === false || specific.specific === false)
      specific.specific = false;
  } else if (
    (operate.isString(key) && key.charAt(0) === '"') ||
    key.charAt(0) === '"'
  ) {
    key = key.replaceAll('"', "");
    key = key.replaceAll("'", "");
    await matchObject(key, [...keys], result, specific, pkey, lkey);
  } else {
    // if(key === 'sheet')console.log(obj, key, obj[key]);
    await matchObject(obj[key], [...keys], result, specific, pkey, lkey);
  }

  if (specific.specific === true) {
    return result[0];
  }
  if (result.length === 0) {
    return undefined;
  }
  return result;
}

var CSSStyleSheetSchema = {
  rules: "cssRules.$all.$only-object.$follow-CSSRuleSchema",
  type: "constructor.name",
};
var CSSRuleSchema = {
  "~$condition-(selectorText||keyText)":
    "style.$all-with-keys.$non-empty.$only-string",
  conditionText: "conditionText",
  rules: "cssRules.$all.$only-object.$follow-CSSRuleSchema",
  name: "name",
  namespaceURI: "namespaceURI",
  prefix: "prefix",

  type: "constructor.name",
};
function css2json(stylesheet, model) {
  if (!model) model = CSSStyleSheetSchema;
  return copyAs(stylesheet, model);
}

var HTMLSchema = {
  name: "tagName",
  type: "$condition-(wholeText && tagName != 'SCRIPT')?'text':((data)?'comment' : 'element')",
  attributes:
    '$condition-((tagName==="STYLE")?undefined:attributes.$all.$into-parent.$only-object.$follow-HTMLAttributeSchema)',
  items:
    '$condition-((tagName==="STYLE")?undefined:childNodes.$all.$only-object.$follow-HTMLSchema)',
  text: "$condition-(wholeText)?wholeText:((data)?data:text)",
  sheet:
    '$condition-((tagName==="STYLE")?sheet.$only-object.$into-parent.$follow-CSSStyleSheetSchema:undefined)',
};
var HTMLAttributeSchema = {
  "~name": "nodeValue",
};
function html2json(elem, model) {
  if (!model) model = HTMLSchema;
  var x = copyAs(elem, model);
  return x;
}

class operate {
  //This method takes a string input, and makes a search in an object, irrelevent weder object or Array.
  //It takes options paramerte like
  // Recurse: Boolean, true makes an isInside Search Recursive.
  //LookAt:Key/Values/All. Where should it look at .Key only looks at keys, values only looks at values. All looks at all
  //Strict. looks for Exact Match/
  static isInside(entity2SearchIn, string2Search, options) {
    console.log(Object.values(entity2SearchIn), string2Search);
  }
  static validate(value, rules) {
    var self = this;
    return rules.every(function (rule) {
      return self[rule](value);
    });
  }
  static trueTypeOf(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  }

  // operate to check if the input is not null or undefined to be added
  static isEmpty(argA) {
    return Object.keys(argA).length === 0 ? true : false;
  }
  static isNotEmpty(argA) {
    return argA !== "" && argA !== null && typeof argA !== "undefined"
      ? true
      : false;
  }
  //returs the data Type of the input.
  static is(argA) {
    // console.log(argA);
    return Object.getPrototypeOf(argA).constructor.name;
  }
  static isInt(argA) {
    return Number.isInteger(argA);
  }
  static isNumber(argA) {
    return Number.parseFloat(argA).toString() !== "NaN";
  }
  static isString(argA) {
    return typeof argA === "string" ? true : false;
  }
  /**
   * returns if the input is a key/value in the object options.argB
   * @param {*} argA
   * @param {*} argB  is required to be not empty
   *
   */
  static isInsideArray(argA, argB) {
    // console.log("IsInside", argA, argB);
    return argB.indexOf(argA) > -1 ? true : false;
  }
  //Find iside an object, array or Object, returns if find keys
  static find(entity, keyTofind, lookat) {
    // console.log("yo")
    //  console.log("finding", keyTofind, "in", entity, lookat);

    var result = Object[lookat](entity).filter(function (key, index, self) {
      //  console.log(keyTofind, key, index, self);
      return !key.indexOf(keyTofind);
    });
    // console.log("found result", result)
    return result;
  }

  static findMatchingInArrayOfObject(entity, keyTofind, value2Match, lookat) {
    //   console.log("matching Values for keyword", keyTofind, "in", entity, lookat);

    var result = Object[lookat](entity).filter(function (key, index, self) {
      //   console.log(key, index, value2Match, self);
      if (key[keyTofind] === value2Match) {
        // console.log("found", key[keyTofind], key)
        return key;
      }
    });
    return result;
  }
  //curently works only for string numbers
  static isEqualStrict(argA, argB) {
    return argA === argB ? true : false;
  }
  //for array's one sided value existence check, return true if each element of a is present in b
  static isGreaterThan(argA, argB) {
    return argA > argB ? true : false;
  }
  static isGreaterthanOrEqual(argA, argB) {
    return (argA) => (argB ? true : false);
  }
  static isSmallerthan(argA, argB) {
    return argA < argB ? true : false;
  }
  static isSmallerthanOrEqual(argA, argB) {
    return argA <= argB ? true : false;
  }
  static instanceof(argA, argB) {
    return console.log("work in process");
  }
  //validate 2 Object, with key's and values
  static isSameObject(argA, argB) {
    return console.log("work in process");
  }
  //check if argB has all the keys from argA // only for array.
  static hasAllof(argA, argB) {
    return argA.every(function (value) {
      console.log(value, argB);
      return operate.isIn(value, argB);
    });
  }
  static arrayIncludes(argA, argB) {
    return argA.includes(function (value) {
      return operate.isIn(value, argB);
    });
  }
  //Check for bothArgument to be Number and Integer to be added.
  static isInRangeNumbers(argA, argB) {
    return argA.every(function (value) {
      return (
        operate.isGreaterthanOrEqual(value, argB.min) &&
        operate.isSmallerthanOrEqual(value, argB.max)
      );
    });
  }
  //return true if all items are the same in two unordered Array need to add a return of mismatch values as option.
  static isSameArray(argA, argB) {
    argA.sort();
    argB.sort();
    if (argA.length !== argB.length) return false;
    for (let i = 0; i < argA.length; i++) {
      if (argA[i] !== argB[i]) return false;
    }
    return true;
  }
  // checks for null and undefined
  static isIterable(obj) {
    if (obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === "function";
  }

  // Returns if a value is an array
  static isArray(value) {
    return (
      value &&
      Array.isArray(value) &&
      typeof value === "object" &&
      value.constructor === Array
    );
  }
  // Returns if a value is a static
  static isstatic(value) {
    return typeof value === "static";
  }
  // Returns if a value is an object
  static isObject(value) {
    return value && typeof value === "object" && value.constructor === Object;
  }
  static isHTML(argA) {
    return operate.is(argA).includes("HTML");
  }
  //Retuns if a values is either of null or undefined
  static isUseless(value) {
    return value === null || typeof value === "undefined";
  }
  // Returns if a value is null
  static isNull(value) {
    return value === null;
  }
  // Returns if a value is undefined
  static isUndefined(value) {
    return typeof value === "undefined";
  }
  // Returns if a value is a boolean
  static isBoolean(value) {
    return typeof value === "boolean";
  }
  //Returns if a value is a regexp
  static isRegExp(value) {
    return value && typeof value === "object" && value.constructor === RegExp;
  }
  // Returns if value is an error object
  static isError(value) {
    return value instanceof Error && typeof value.message !== "undefined";
  }
  // Returns if value is a date object
  static isDate(value) {
    return value instanceof Date;
  }
  //Returns if the value is a Prototyp
  static isPrototype(value) {
    console.log(Object.getPrototypeOf(value) === prototype1);
  }
  // Returns if a Symbol
  static isSymbol(value) {
    return typeof value === "symbol";
  }
  //This function validates a valid Url, Returns True or false
  static isValidUrl(string) {
    try {
      new URL(string);
    } catch (_) {
      return false;
    }
    return true;
  }
  static isValidJSONString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
  /**
   *  * Returns true if the given test value is an array containing at least one object; false otherwise.
   * */
  static isObjectArray_(argA) {
    for (var i = 0; i < argA.length; i++) {
      if (operate.isObject(argA[i])) {
        return true;
      }
    }
    return false;
  }
  static isAlphaNumeric(str) {
    var code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (
        !(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)
      ) {
        // lower alpha (a-z)
        return false;
      }
    }
    return true;
  }
  static escapeString(str) {
    var es = [
      ["\\", "\\\\"],
      ['"', '\\"'],
      ["'", "\\'"],
      ["\b", "\\b"],
      ["\f", "\\f"],
      ["\n", "\\n"],
      ["\r", "\\r"],
      ["\t", "\\t"],
      ["\v", "\\v"],
    ];
    for (var i = 0; i < es.length; i++)
      str = str.replaceAll(es[i][0], es[i][1]);
    return str;
  }
  static isNegative(x) {
    return x < 0;
  }
  static isChild(argA, argB) {}
  static isParent(argA, argB) {}
  static isEven(argA) {
    return numbers.every(function (e) {
      return e % 2 == 0;
    });
  }
  static isOdd(argA) {
    return numbers.every(function (e) {
      return Math.abs(e % 2) == 1;
    });
  }
  /**
   *
   * @param {*} argA This is the input argument, it has to be a string operate.enforce(operate.isString(value), true)
   * @param {*} Object The Object to search this string in .
   * @param {*} options Currently there are 3 optional Parameters.
   *  options.Recurse : true [true,false] Work In progress
   * optoins.filter()
   * options.Lookin : keys [keys, values, all]
   *
   */

  static isActionRequest(obj) {
    return "objectModel" in obj && "method" in obj;
  }
  // static isFlowRequest(obj) {
  //     return "flowRequest" in obj;
  // }
  static isArray(value) {
    return (
      value &&
      Array.isArray(value) &&
      typeof value === "object" &&
      value.constructor === Array
    );
  }
  static isFunction(obj) {
    return typeof obj === "function";
  }
}

async function json2html(query, parent, first = true) {
  if (!query) return undefined;
  if (first) query = JSON.parse(JSON.stringify(query));

  if (!operate.isArray(query) && query.length === undefined) {
    var waselem = true;
    query = [query];
  }
  for (var i = 0; i < query.length; i++) {
    if (query[i].type === "comment") {
      var el = document.createComment(query[i].text);
      if (parent) parent.appendChild(el);
    } else if (query[i].type === "text") {
      var el = document.createTextNode(query[i].text);
      if (parent) parent.appendChild(el);
    } else if (
      query[i].name &&
      (query[i].name.toLowerCase() === "style" ||
        (query[i].name.toLowerCase() === "link" && query[i].sheet))
    ) {
      var text = await json2css(query[i].sheet);

      var el = document.createElement("style");
      el.innerHTML = text;
      if (parent) parent.appendChild(el);
    } else {
      var el = document.createElement(query[i].name || "div");
      for (var key in query[i].attributes) {
        if (key.toLowerCase() === "style") {
          for (var k in query[i].attributes.style) {
            el.style[k] = query[i].attributes.style[k];
          }
        } else el.setAttribute(key, query[i].attributes[key]);
      }
      if (query[i].items) await json2html(query[i].items, el, false);

      if (parent) parent.appendChild(el);
      query[i] = el;
    }
  }
  if (waselem) return query[0];
  return query;
}

// console.log(JSON.stringify(await html2json(document.querySelector("html"))));
