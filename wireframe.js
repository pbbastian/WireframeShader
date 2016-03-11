var toggleTeapotButton = document.getElementById('toggle-teapot');
var toggleCameraButton = document.getElementById('toggle-camera');
var toggleQuadsButton = document.getElementById('toggle-quads');
var canvas = document.getElementById("gl-canvas");

function init() {
    var up = vec3(0, 1, 0);
    var baseFovY = 90;
    var fovY = 20;
    var aspect = canvas.width / canvas.height;
    var near = 0.1;
    var far = 30;
    var light = vec3(0.0, 2.0, 2.0);
    var thickness;
    
    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix;
    
    var teapotFile = loadFileAJAX(fileName);
    var teapot = new OBJDoc(fileName);
    teapot.parse(teapotFile, 0.25, false);

    var positions = [];
    var normals = [];
    var barycentrics = [];
    console.log(teapot);
    for (var i = 0; i < teapot.objects[0].faces.length; i++) {
        var face = teapot.objects[0].faces[i];
        for (var j = 0; j < face.numIndices; j++) {
            var vertex = teapot.vertices[face.vIndices[j]];
            var normal = teapot.normals[face.nIndices[j]];
            positions.push(vec3(vertex.x, vertex.y, vertex.z));
            normals.push(vec3(normal.x, normal.y, normal.z));
            barycentrics.push(vec3(+(j%3 === 0), +(j%3 === 1), +(j%3 === 2)));
        }
    }

    var gl = WebGLUtils.setupWebGL(canvas, { alpha: false });
    gl.getExtension('OES_standard_derivatives');
    gl.clearColor(0.99, 0.96, 0.70, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    // gl.cullFace(gl.BACK);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var wfProgram = initShaders(gl, '/project/wireframe.vert', '/project/wireframe.frag');
    
    // SETUP AND BUFFER WIREFRAME SHADER
    gl.useProgram(wfProgram);
    
    var wfInfo = {
        a_position_model: {
            location: gl.getAttribLocation(wfProgram, 'a_position_model'),
            buffer: gl.createBuffer()
        },
        a_normal: {
            location: gl.getAttribLocation(wfProgram, 'a_normal'),
            buffer: gl.createBuffer()
        },
        a_barycentric: {
            location: gl.getAttribLocation(wfProgram, 'a_barycentric'),
            buffer: gl.createBuffer()
        },
        u_modelView: gl.getUniformLocation(wfProgram, 'u_modelView'),
        u_projection: gl.getUniformLocation(wfProgram, 'u_projection'),
        u_normal: gl.getUniformLocation(wfProgram, 'u_normal'),
        u_eye_world: gl.getUniformLocation(wfProgram, 'u_eye_world'),
        u_thickness: gl.getUniformLocation(wfProgram, 'u_thickness'),
        u_front: gl.getUniformLocation(wfProgram, 'u_front'),
        u_quads: gl.getUniformLocation(wfProgram, 'u_quads')
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, wfInfo.a_position_model.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, wfInfo.a_normal.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, wfInfo.a_barycentric.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(barycentrics), gl.STATIC_DRAW);
    
    var moveTeapot = false;
    var rotateCamera = false;
    var useQuads = false;
    var phi = 0;
    var theta = 0;
    
    toggleTeapotButton.addEventListener('click', function() {
        moveTeapot = !moveTeapot;
    });
    
    toggleCameraButton.addEventListener('click', function() {
        rotateCamera = !rotateCamera;
    });
    
    toggleQuadsButton.addEventListener('click', function() {
        useQuads = !useQuads;
    });
    
    createSlider('fov', function (value) {
        fovY = value;
    });
    
    createSlider('thickness', function (value) {
        thickness = value;
    });
    
    requestAnimationFrame(function render() {
        phi += moveTeapot ? 0.02 : 0;
        theta += rotateCamera ? 0.1 : 0;
        
        light[0] = Math.sin(theta)*2;
        light[2] = Math.cos(theta)*2 - 2;
        
        var rotatedViewMatrix = mult(viewMatrix, rotateY(theta));
        
        projectionMatrix = perspective(fovY, aspect, near, far);
        var teapotModelMatrix = translate(0, 0.25 + 0.25 * Math.sin(phi), 0);
        var teapotModelViewMatrix = mult(rotatedViewMatrix, teapotModelMatrix);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(wfProgram);
        enableWireframeProgram(gl, wfInfo);
        gl.uniformMatrix4fv(wfInfo.u_modelView, false, flatten(teapotModelViewMatrix));
        gl.uniformMatrix4fv(wfInfo.u_projection, false, flatten(projectionMatrix));
        gl.uniform3fv(wfInfo.u_eye_world, flatten(eye));
        gl.uniform1f(wfInfo.u_thickness, thickness * baseFovY/fovY);
        gl.uniform1i(wfInfo.u_quads, useQuads);
        
        // Ensure that front vertices are always source in blending
        gl.cullFace(gl.FRONT);
        gl.uniform1i(wfInfo.u_front, false);
        gl.drawArrays(gl.TRIANGLES, 0, positions.length);
        gl.cullFace(gl.BACK);
        gl.uniform1i(wfInfo.u_front, true);
        gl.drawArrays(gl.TRIANGLES, 0, positions.length);
        
        requestAnimationFrame(render);
    });
}

function createSlider(id, onChange) {
    var range = document.getElementById(id);
    range.addEventListener('input', function () {
        onChange(range.value);
    });
    onChange(range.value);
}

function matrixVectorMult(A, x) {
    var Ax = [];
    for (var i = 0; i < x.length; i++) {
        var sum = 0;
        for (var j = 0; j < x.length; j++) {
            sum += A[j][i] * x[i];
        }
        Ax.push(sum);
    }
    // AND MY
    return Ax;
}

function enableWireframeProgram(gl, wfInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, wfInfo.a_position_model.buffer);
    gl.enableVertexAttribArray(wfInfo.a_position_model.location);
    gl.vertexAttribPointer(wfInfo.a_position_model.location, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, wfInfo.a_normal.buffer);
    gl.enableVertexAttribArray(wfInfo.a_normal.location);
    gl.vertexAttribPointer(wfInfo.a_normal.location, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, wfInfo.a_barycentric.buffer);
    gl.enableVertexAttribArray(wfInfo.a_barycentric.location);
    gl.vertexAttribPointer(wfInfo.a_barycentric.location, 3, gl.FLOAT, false, 0, 0);
}

init();