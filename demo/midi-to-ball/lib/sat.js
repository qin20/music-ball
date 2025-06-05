var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function createCommonjsModule(fn, basedir, module) {
  return module = {
    path: basedir,
    exports: {},
    require: function(path, base) {
      return commonjsRequire(path, base === void 0 || base === null ? module.path : base);
    }
  }, fn(module, module.exports), module.exports;
}
function commonjsRequire() {
  throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
var SAT = createCommonjsModule(function(module, exports) {
  /** @preserve SAT.js - Version 0.9.0 - Copyright 2012 - 2021 - Jim Riecken <jimr@jimr.ca> - released under the MIT License. https://github.com/jriecken/sat-js */
  (function(root, factory) {
    {
      module["exports"] = factory();
    }
  })(commonjsGlobal, function() {
    var SAT2 = {};
    function Vector2(x, y) {
      this["x"] = x || 0;
      this["y"] = y || 0;
    }
    SAT2["Vector"] = Vector2;
    SAT2["V"] = Vector2;
    Vector2.prototype["copy"] = Vector2.prototype.copy = function(other) {
      this["x"] = other["x"];
      this["y"] = other["y"];
      return this;
    };
    Vector2.prototype["clone"] = Vector2.prototype.clone = function() {
      return new Vector2(this["x"], this["y"]);
    };
    Vector2.prototype["perp"] = Vector2.prototype.perp = function() {
      var x = this["x"];
      this["x"] = this["y"];
      this["y"] = -x;
      return this;
    };
    Vector2.prototype["rotate"] = Vector2.prototype.rotate = function(angle) {
      var x = this["x"];
      var y = this["y"];
      this["x"] = x * Math.cos(angle) - y * Math.sin(angle);
      this["y"] = x * Math.sin(angle) + y * Math.cos(angle);
      return this;
    };
    Vector2.prototype["reverse"] = Vector2.prototype.reverse = function() {
      this["x"] = -this["x"];
      this["y"] = -this["y"];
      return this;
    };
    Vector2.prototype["normalize"] = Vector2.prototype.normalize = function() {
      var d = this.len();
      if (d > 0) {
        this["x"] = this["x"] / d;
        this["y"] = this["y"] / d;
      }
      return this;
    };
    Vector2.prototype["add"] = Vector2.prototype.add = function(other) {
      this["x"] += other["x"];
      this["y"] += other["y"];
      return this;
    };
    Vector2.prototype["sub"] = Vector2.prototype.sub = function(other) {
      this["x"] -= other["x"];
      this["y"] -= other["y"];
      return this;
    };
    Vector2.prototype["scale"] = Vector2.prototype.scale = function(x, y) {
      this["x"] *= x;
      this["y"] *= typeof y != "undefined" ? y : x;
      return this;
    };
    Vector2.prototype["project"] = Vector2.prototype.project = function(other) {
      var amt = this.dot(other) / other.len2();
      this["x"] = amt * other["x"];
      this["y"] = amt * other["y"];
      return this;
    };
    Vector2.prototype["projectN"] = Vector2.prototype.projectN = function(other) {
      var amt = this.dot(other);
      this["x"] = amt * other["x"];
      this["y"] = amt * other["y"];
      return this;
    };
    Vector2.prototype["reflect"] = Vector2.prototype.reflect = function(axis) {
      var x = this["x"];
      var y = this["y"];
      this.project(axis).scale(2);
      this["x"] -= x;
      this["y"] -= y;
      return this;
    };
    Vector2.prototype["reflectN"] = Vector2.prototype.reflectN = function(axis) {
      var x = this["x"];
      var y = this["y"];
      this.projectN(axis).scale(2);
      this["x"] -= x;
      this["y"] -= y;
      return this;
    };
    Vector2.prototype["dot"] = Vector2.prototype.dot = function(other) {
      return this["x"] * other["x"] + this["y"] * other["y"];
    };
    Vector2.prototype["len2"] = Vector2.prototype.len2 = function() {
      return this.dot(this);
    };
    Vector2.prototype["len"] = Vector2.prototype.len = function() {
      return Math.sqrt(this.len2());
    };
    function Circle2(pos, r) {
      this["pos"] = pos || new Vector2();
      this["r"] = r || 0;
      this["offset"] = new Vector2();
    }
    SAT2["Circle"] = Circle2;
    Circle2.prototype["getAABBAsBox"] = Circle2.prototype.getAABBAsBox = function() {
      var r = this["r"];
      var corner = this["pos"].clone().add(this["offset"]).sub(new Vector2(r, r));
      return new Box2(corner, r * 2, r * 2);
    };
    Circle2.prototype["getAABB"] = Circle2.prototype.getAABB = function() {
      return this.getAABBAsBox().toPolygon();
    };
    Circle2.prototype["setOffset"] = Circle2.prototype.setOffset = function(offset) {
      this["offset"] = offset;
      return this;
    };
    function Polygon2(pos, points) {
      this["pos"] = pos || new Vector2();
      this["angle"] = 0;
      this["offset"] = new Vector2();
      this.setPoints(points || []);
    }
    SAT2["Polygon"] = Polygon2;
    Polygon2.prototype["setPoints"] = Polygon2.prototype.setPoints = function(points) {
      var lengthChanged = !this["points"] || this["points"].length !== points.length;
      if (lengthChanged) {
        var i2;
        var calcPoints = this["calcPoints"] = [];
        var edges = this["edges"] = [];
        var normals = this["normals"] = [];
        for (i2 = 0; i2 < points.length; i2++) {
          var p1 = points[i2];
          var p2 = i2 < points.length - 1 ? points[i2 + 1] : points[0];
          if (p1 !== p2 && p1.x === p2.x && p1.y === p2.y) {
            points.splice(i2, 1);
            i2 -= 1;
            continue;
          }
          calcPoints.push(new Vector2());
          edges.push(new Vector2());
          normals.push(new Vector2());
        }
      }
      this["points"] = points;
      this._recalc();
      return this;
    };
    Polygon2.prototype["setAngle"] = Polygon2.prototype.setAngle = function(angle) {
      this["angle"] = angle;
      this._recalc();
      return this;
    };
    Polygon2.prototype["setOffset"] = Polygon2.prototype.setOffset = function(offset) {
      this["offset"] = offset;
      this._recalc();
      return this;
    };
    Polygon2.prototype["rotate"] = Polygon2.prototype.rotate = function(angle) {
      var points = this["points"];
      var len = points.length;
      for (var i2 = 0; i2 < len; i2++) {
        points[i2].rotate(angle);
      }
      this._recalc();
      return this;
    };
    Polygon2.prototype["translate"] = Polygon2.prototype.translate = function(x, y) {
      var points = this["points"];
      var len = points.length;
      for (var i2 = 0; i2 < len; i2++) {
        points[i2]["x"] += x;
        points[i2]["y"] += y;
      }
      this._recalc();
      return this;
    };
    Polygon2.prototype._recalc = function() {
      var calcPoints = this["calcPoints"];
      var edges = this["edges"];
      var normals = this["normals"];
      var points = this["points"];
      var offset = this["offset"];
      var angle = this["angle"];
      var len = points.length;
      var i2;
      for (i2 = 0; i2 < len; i2++) {
        var calcPoint = calcPoints[i2].copy(points[i2]);
        calcPoint["x"] += offset["x"];
        calcPoint["y"] += offset["y"];
        if (angle !== 0) {
          calcPoint.rotate(angle);
        }
      }
      for (i2 = 0; i2 < len; i2++) {
        var p1 = calcPoints[i2];
        var p2 = i2 < len - 1 ? calcPoints[i2 + 1] : calcPoints[0];
        var e = edges[i2].copy(p2).sub(p1);
        normals[i2].copy(e).perp().normalize();
      }
      return this;
    };
    Polygon2.prototype["getAABBAsBox"] = Polygon2.prototype.getAABBAsBox = function() {
      var points = this["calcPoints"];
      var len = points.length;
      var xMin = points[0]["x"];
      var yMin = points[0]["y"];
      var xMax = points[0]["x"];
      var yMax = points[0]["y"];
      for (var i2 = 1; i2 < len; i2++) {
        var point = points[i2];
        if (point["x"] < xMin) {
          xMin = point["x"];
        } else if (point["x"] > xMax) {
          xMax = point["x"];
        }
        if (point["y"] < yMin) {
          yMin = point["y"];
        } else if (point["y"] > yMax) {
          yMax = point["y"];
        }
      }
      return new Box2(this["pos"].clone().add(new Vector2(xMin, yMin)), xMax - xMin, yMax - yMin);
    };
    Polygon2.prototype["getAABB"] = Polygon2.prototype.getAABB = function() {
      return this.getAABBAsBox().toPolygon();
    };
    Polygon2.prototype["getCentroid"] = Polygon2.prototype.getCentroid = function() {
      var points = this["calcPoints"];
      var len = points.length;
      var cx = 0;
      var cy = 0;
      var ar = 0;
      for (var i2 = 0; i2 < len; i2++) {
        var p1 = points[i2];
        var p2 = i2 === len - 1 ? points[0] : points[i2 + 1];
        var a = p1["x"] * p2["y"] - p2["x"] * p1["y"];
        cx += (p1["x"] + p2["x"]) * a;
        cy += (p1["y"] + p2["y"]) * a;
        ar += a;
      }
      ar = ar * 3;
      cx = cx / ar;
      cy = cy / ar;
      return new Vector2(cx, cy);
    };
    function Box2(pos, w, h) {
      this["pos"] = pos || new Vector2();
      this["w"] = w || 0;
      this["h"] = h || 0;
    }
    SAT2["Box"] = Box2;
    Box2.prototype["toPolygon"] = Box2.prototype.toPolygon = function() {
      var pos = this["pos"];
      var w = this["w"];
      var h = this["h"];
      return new Polygon2(new Vector2(pos["x"], pos["y"]), [
        new Vector2(),
        new Vector2(w, 0),
        new Vector2(w, h),
        new Vector2(0, h)
      ]);
    };
    function Response2() {
      this["a"] = null;
      this["b"] = null;
      this["overlapN"] = new Vector2();
      this["overlapV"] = new Vector2();
      this.clear();
    }
    SAT2["Response"] = Response2;
    Response2.prototype["clear"] = Response2.prototype.clear = function() {
      this["aInB"] = true;
      this["bInA"] = true;
      this["overlap"] = Number.MAX_VALUE;
      return this;
    };
    var T_VECTORS = [];
    for (var i = 0; i < 10; i++) {
      T_VECTORS.push(new Vector2());
    }
    var T_ARRAYS = [];
    for (var i = 0; i < 5; i++) {
      T_ARRAYS.push([]);
    }
    var T_RESPONSE = new Response2();
    var TEST_POINT = new Box2(new Vector2(), 1e-6, 1e-6).toPolygon();
    function flattenPointsOn(points, normal, result) {
      var min = Number.MAX_VALUE;
      var max = -Number.MAX_VALUE;
      var len = points.length;
      for (var i2 = 0; i2 < len; i2++) {
        var dot = points[i2].dot(normal);
        if (dot < min) {
          min = dot;
        }
        if (dot > max) {
          max = dot;
        }
      }
      result[0] = min;
      result[1] = max;
    }
    function isSeparatingAxis2(aPos, bPos, aPoints, bPoints, axis, response) {
      var rangeA = T_ARRAYS.pop();
      var rangeB = T_ARRAYS.pop();
      var offsetV = T_VECTORS.pop().copy(bPos).sub(aPos);
      var projectedOffset = offsetV.dot(axis);
      flattenPointsOn(aPoints, axis, rangeA);
      flattenPointsOn(bPoints, axis, rangeB);
      rangeB[0] += projectedOffset;
      rangeB[1] += projectedOffset;
      if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
        T_VECTORS.push(offsetV);
        T_ARRAYS.push(rangeA);
        T_ARRAYS.push(rangeB);
        return true;
      }
      if (response) {
        var overlap = 0;
        if (rangeA[0] < rangeB[0]) {
          response["aInB"] = false;
          if (rangeA[1] < rangeB[1]) {
            overlap = rangeA[1] - rangeB[0];
            response["bInA"] = false;
          } else {
            var option1 = rangeA[1] - rangeB[0];
            var option2 = rangeB[1] - rangeA[0];
            overlap = option1 < option2 ? option1 : -option2;
          }
        } else {
          response["bInA"] = false;
          if (rangeA[1] > rangeB[1]) {
            overlap = rangeA[0] - rangeB[1];
            response["aInB"] = false;
          } else {
            var option1 = rangeA[1] - rangeB[0];
            var option2 = rangeB[1] - rangeA[0];
            overlap = option1 < option2 ? option1 : -option2;
          }
        }
        var absOverlap = Math.abs(overlap);
        if (absOverlap < response["overlap"]) {
          response["overlap"] = absOverlap;
          response["overlapN"].copy(axis);
          if (overlap < 0) {
            response["overlapN"].reverse();
          }
        }
      }
      T_VECTORS.push(offsetV);
      T_ARRAYS.push(rangeA);
      T_ARRAYS.push(rangeB);
      return false;
    }
    SAT2["isSeparatingAxis"] = isSeparatingAxis2;
    function voronoiRegion(line, point) {
      var len2 = line.len2();
      var dp = point.dot(line);
      if (dp < 0) {
        return LEFT_VORONOI_REGION;
      } else if (dp > len2) {
        return RIGHT_VORONOI_REGION;
      } else {
        return MIDDLE_VORONOI_REGION;
      }
    }
    var LEFT_VORONOI_REGION = -1;
    var MIDDLE_VORONOI_REGION = 0;
    var RIGHT_VORONOI_REGION = 1;
    function pointInCircle2(p, c) {
      var differenceV = T_VECTORS.pop().copy(p).sub(c["pos"]).sub(c["offset"]);
      var radiusSq = c["r"] * c["r"];
      var distanceSq = differenceV.len2();
      T_VECTORS.push(differenceV);
      return distanceSq <= radiusSq;
    }
    SAT2["pointInCircle"] = pointInCircle2;
    function pointInPolygon2(p, poly) {
      TEST_POINT["pos"].copy(p);
      T_RESPONSE.clear();
      var result = testPolygonPolygon2(TEST_POINT, poly, T_RESPONSE);
      if (result) {
        result = T_RESPONSE["aInB"];
      }
      return result;
    }
    SAT2["pointInPolygon"] = pointInPolygon2;
    function testCircleCircle2(a, b, response) {
      var differenceV = T_VECTORS.pop().copy(b["pos"]).add(b["offset"]).sub(a["pos"]).sub(a["offset"]);
      var totalRadius = a["r"] + b["r"];
      var totalRadiusSq = totalRadius * totalRadius;
      var distanceSq = differenceV.len2();
      if (distanceSq > totalRadiusSq) {
        T_VECTORS.push(differenceV);
        return false;
      }
      if (response) {
        var dist = Math.sqrt(distanceSq);
        response["a"] = a;
        response["b"] = b;
        response["overlap"] = totalRadius - dist;
        response["overlapN"].copy(differenceV.normalize());
        response["overlapV"].copy(differenceV).scale(response["overlap"]);
        response["aInB"] = a["r"] <= b["r"] && dist <= b["r"] - a["r"];
        response["bInA"] = b["r"] <= a["r"] && dist <= a["r"] - b["r"];
      }
      T_VECTORS.push(differenceV);
      return true;
    }
    SAT2["testCircleCircle"] = testCircleCircle2;
    function testPolygonCircle2(polygon, circle, response) {
      var circlePos = T_VECTORS.pop().copy(circle["pos"]).add(circle["offset"]).sub(polygon["pos"]);
      var radius = circle["r"];
      var radius2 = radius * radius;
      var points = polygon["calcPoints"];
      var len = points.length;
      var edge = T_VECTORS.pop();
      var point = T_VECTORS.pop();
      for (var i2 = 0; i2 < len; i2++) {
        var next = i2 === len - 1 ? 0 : i2 + 1;
        var prev = i2 === 0 ? len - 1 : i2 - 1;
        var overlap = 0;
        var overlapN = null;
        edge.copy(polygon["edges"][i2]);
        point.copy(circlePos).sub(points[i2]);
        if (response && point.len2() > radius2) {
          response["aInB"] = false;
        }
        var region = voronoiRegion(edge, point);
        if (region === LEFT_VORONOI_REGION) {
          edge.copy(polygon["edges"][prev]);
          var point2 = T_VECTORS.pop().copy(circlePos).sub(points[prev]);
          region = voronoiRegion(edge, point2);
          if (region === RIGHT_VORONOI_REGION) {
            var dist = point.len();
            if (dist > radius) {
              T_VECTORS.push(circlePos);
              T_VECTORS.push(edge);
              T_VECTORS.push(point);
              T_VECTORS.push(point2);
              return false;
            } else if (response) {
              response["bInA"] = false;
              overlapN = point.normalize();
              overlap = radius - dist;
            }
          }
          T_VECTORS.push(point2);
        } else if (region === RIGHT_VORONOI_REGION) {
          edge.copy(polygon["edges"][next]);
          point.copy(circlePos).sub(points[next]);
          region = voronoiRegion(edge, point);
          if (region === LEFT_VORONOI_REGION) {
            var dist = point.len();
            if (dist > radius) {
              T_VECTORS.push(circlePos);
              T_VECTORS.push(edge);
              T_VECTORS.push(point);
              return false;
            } else if (response) {
              response["bInA"] = false;
              overlapN = point.normalize();
              overlap = radius - dist;
            }
          }
        } else {
          var normal = edge.perp().normalize();
          var dist = point.dot(normal);
          var distAbs = Math.abs(dist);
          if (dist > 0 && distAbs > radius) {
            T_VECTORS.push(circlePos);
            T_VECTORS.push(normal);
            T_VECTORS.push(point);
            return false;
          } else if (response) {
            overlapN = normal;
            overlap = radius - dist;
            if (dist >= 0 || overlap < 2 * radius) {
              response["bInA"] = false;
            }
          }
        }
        if (overlapN && response && Math.abs(overlap) < Math.abs(response["overlap"])) {
          response["overlap"] = overlap;
          response["overlapN"].copy(overlapN);
        }
      }
      if (response) {
        response["a"] = polygon;
        response["b"] = circle;
        response["overlapV"].copy(response["overlapN"]).scale(response["overlap"]);
      }
      T_VECTORS.push(circlePos);
      T_VECTORS.push(edge);
      T_VECTORS.push(point);
      return true;
    }
    SAT2["testPolygonCircle"] = testPolygonCircle2;
    function testCirclePolygon2(circle, polygon, response) {
      var result = testPolygonCircle2(polygon, circle, response);
      if (result && response) {
        var a = response["a"];
        var aInB = response["aInB"];
        response["overlapN"].reverse();
        response["overlapV"].reverse();
        response["a"] = response["b"];
        response["b"] = a;
        response["aInB"] = response["bInA"];
        response["bInA"] = aInB;
      }
      return result;
    }
    SAT2["testCirclePolygon"] = testCirclePolygon2;
    function testPolygonPolygon2(a, b, response) {
      var aPoints = a["calcPoints"];
      var aLen = aPoints.length;
      var bPoints = b["calcPoints"];
      var bLen = bPoints.length;
      for (var i2 = 0; i2 < aLen; i2++) {
        if (isSeparatingAxis2(a["pos"], b["pos"], aPoints, bPoints, a["normals"][i2], response)) {
          return false;
        }
      }
      for (var i2 = 0; i2 < bLen; i2++) {
        if (isSeparatingAxis2(a["pos"], b["pos"], aPoints, bPoints, b["normals"][i2], response)) {
          return false;
        }
      }
      if (response) {
        response["a"] = a;
        response["b"] = b;
        response["overlapV"].copy(response["overlapN"]).scale(response["overlap"]);
      }
      return true;
    }
    SAT2["testPolygonPolygon"] = testPolygonPolygon2;
    return SAT2;
  });
});
var Box = SAT.Box;
var Circle = SAT.Circle;
var Polygon = SAT.Polygon;
var Response = SAT.Response;
var V = SAT.V;
var Vector = SAT.Vector;
export default SAT;
var isSeparatingAxis = SAT.isSeparatingAxis;
var pointInCircle = SAT.pointInCircle;
var pointInPolygon = SAT.pointInPolygon;
var testCircleCircle = SAT.testCircleCircle;
var testCirclePolygon = SAT.testCirclePolygon;
var testPolygonCircle = SAT.testPolygonCircle;
var testPolygonPolygon = SAT.testPolygonPolygon;
export {Box, Circle, Polygon, Response, V, Vector, SAT as __moduleExports, isSeparatingAxis, pointInCircle, pointInPolygon, testCircleCircle, testCirclePolygon, testPolygonCircle, testPolygonPolygon};
