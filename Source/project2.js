/////////////////////////////////////////////
//
// Vitontonio Carmalitano
// Mathew Sherry
// CS452: Project 2
// April 19, 2015
//
// project2.js
//
/////////////////////////////////////////////

var canvas;
var gl;
var program;

// Vertices responsible for the shape of our model.
var numVertices = 8;
var vertices =
    [
        vec4( -0.1,  -0.3,  0.1, 1.0 ),
        vec4( -0.1,  -0.1,  0.1, 1.0 ),
        vec4(  0.1,  -0.1,  0.1, 1.0 ),
        vec4(  0.1,  -0.3,  0.1, 1.0 ),
        vec4( -0.1,  -0.3, -0.1, 1.0 ),
        vec4( -0.1,  -0.1, -0.1, 1.0 ),
        vec4(  0.1,  -0.1, -0.1, 1.0 ),
        vec4(  0.1,  -0.3, -0.1, 1.0 ),
    ];

var cubeVerts1 =
	[
        vec4( -0.1, -0.1,  0.1 ),
        vec4( -0.1,  0.1,  0.1 ),
        vec4(  0.1,  0.1,  0.1 ),
        vec4(  0.1, -0.1,  0.1 ),
        vec4( -0.1, -0.1, -0.1 ),
        vec4( -0.1,  0.1, -0.1 ),
        vec4(  0.1,  0.1, -0.1 ),
        vec4(  0.1, -0.1, -0.1 ),
	];
	
// Used for holding data after we form quads from our vertices.
var pointsArray = [];
var normalsArray = [];

// Lighting and material attributes used for the phong lighting model.
var lightPosi = vec4(1.0, 1.0, 1.0, 0.0);
var lightAmbi = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiff = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpec = vec4(1.0, 1.0, 1.0, 1.0);

var matAmbi = vec4(1.0, 0.0, 1.0, 1.0);
var matDiff = vec4(1.0, 0.8, 0.0, 1.0);
var matSpec = vec4(1.0, 0.8, 0.0, 1.0);
var matShininess = 100.0;

// Colors based on lighting.
var ambiColor;
var diffColor;
var specColor;

// Matrices for MV-P transformations.
var MVMatrix;
var PMatrix;

// Position of our viewer (camera).
var viewerPos;

// How much we update our x and y per loop.
var xDelta;
var position = [0, 0, 0];

// The actual speed we're moving at.
const speed = 0.04;

// If we're updating our positions.
var updateXPos = false;
var resetPos = false;

var restart = false;


// To contain the rotation values of our model.
var theta = [0, 0, 0];

// To control which of the four directions the model should rotate.
var rotateFlags =
    [
        false,
        false,
        false,
        false,
    ];

/*
 * Initialize our program including shaders, attributes, and model.
 */
window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
    {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // So we can't see through the faces of our model.
    gl.enable(gl.CULL_FACE);

    // Load shaders and initialize attribute buffers.
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    formModel();

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    viewerPos = vec3(0.0, 0.0, -20.0);
    PMatrix = ortho(-1, 1, -1, 1, -100, 100);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "PMatrix"), false, flatten(PMatrix));
    
    ambiProd = mult(lightAmbi, matAmbi);
    diffProd = mult(lightDiff, matDiff);
    specProd = mult(lightSpec, matSpec); 
    
    gl.uniform4fv(gl.getUniformLocation(program, "ambiProd"), flatten(ambiProd));
    gl.uniform4fv(gl.getUniformLocation(program, "diffProd"), flatten(diffProd));
    gl.uniform4fv(gl.getUniformLocation(program, "specProd"), flatten(specProd));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPos"), flatten(lightPosi));
       
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), matShininess);

    document.onkeydown = onKeyDown;
    document.onkeyup = onKeyUp;
          
    loop();
}

/*
 * The function responsible for continuously updating the program.
 */
function loop()
{
	if (updateXPos)
		updateXPosition();
	
	updateRotation();
    // Update our MVMatrix.
    MVMatrix = mat4();
    MVMatrix = mult(MVMatrix, rotate(theta[0], [1, 0, 0]));
    MVMatrix = mult(MVMatrix, rotate(theta[1], [0, 1, 0]));
    MVMatrix = mult(MVMatrix, rotate(theta[2], [0, 0, 1]));
      //MVMatrix = mult(MVMatrix, rotate(theta[1],[0, 1, 0]);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "MVMatrix"), false, flatten(MVMatrix));
    gl.uniform1i(gl.getUniformLocation(program, "index"), 0);

    render();
    requestAnimFrame(loop);
}

/*
 * Renders our model.
 */
function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
	
	// Rebind our position for our character.
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
}

/*
 * Given four vertices, turn them into a quad polygon.
 */
function formQuad(a, b, c, d)
{
    var v1 = subtract(vertices[b], vertices[a]);
    var v2 = subtract(vertices[c], vertices[b]);
    var normal = normalize(vec3(cross(v1, v2)));

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);
    pointsArray.push(vertices[b]);
    normalsArray.push(normal);
    pointsArray.push(vertices[c]);
    normalsArray.push(normal);
    pointsArray.push(vertices[a]);
    normalsArray.push(normal);
    pointsArray.push(vertices[c]);
    normalsArray.push(normal);
    pointsArray.push(vertices[d]);
    normalsArray.push(normal);
}

/*
 * Send quadtuples of vertices to be turned into a polygon.
 */
function formModel()
{
    formQuad(1, 0, 3, 2);
    formQuad(2, 3, 7, 6);
    formQuad(3, 0, 4, 7);
    formQuad(6, 5, 1, 2);
    formQuad(4, 5, 6, 7);
    formQuad(5, 4, 0, 1);
}

/*
 * Handles events when a key is pressed.
 */
function onKeyDown(event) {
    var key = String.fromCharCode(event.keyCode);

    switch (key) {
        case 'W':
            break;

        case 'S':
            break;

        case 'A':
		    xDelta = -speed;
			rotateFlags[0] = true;
            updateXPos = true;
            break;

        case 'D':
		    xDelta = speed;
			rotateFlags[2] = true;
            updateXPos = true;
            break;

		case 'E':
			restart = true;
			break;

        default:
            break;
    }
}

/*
 * Handles events when a key is released.
 */
function onKeyUp(event) {
    var key = String.fromCharCode(event.keyCode);

    switch (key) {

        // Both W and S control vertical movement.
        case 'W':
        case 'S':
            break;

        // Both A and D control horizontal movement.
        case 'A':
        case 'D':
		    updateXPos = false;
			rotateFlags[0] = false;
			rotateFlags[2] = false;
            break;
		case 'E':
			restart = false;
			break;

        default:
            break;
    }
}

/*
 * Updates the y position of our shape by translating the vertices. Also updates
 * the main position y-value for our character.
 */
function updateXPosition() {
	//if ((vertices[0][1] > -1 || yDelta > 0) && (vertices[2][1] < 1 || yDelta < 0)) {
	/*	for (var i = 0; i < numVertices; ++i) {
			vertices[i][0] += xDelta; // Set the vertices to an updated y-position.
		}

		position[1] += xDelta;*/
	//}
}
function updateRotation()
{
    if (rotateFlags[0]) // Left.
        theta[1] -= 2.0;

    if (rotateFlags[1]) // Up.
        theta[0] -= 2.0;

    if (rotateFlags[2]) // Right.
        theta[1] += 2.0;

    if (rotateFlags[3]) // Down.
        theta[0] += 2.0;
}
