precision mediump float;

varying vec3 v_position_model;
varying vec3 v_normal;
varying vec3 v_barycentric;

uniform vec3 u_eye_world;
uniform float u_thickness;
uniform bool u_front;
uniform bool u_quads;

#extension GL_OES_standard_derivatives : enable

void main() {
    vec3 d = fwidth(v_barycentric);
    
    float thinFactor = u_thickness;
    float fatFactor = thinFactor * 2.0;
    
    vec3 thinEdge = smoothstep(vec3(0.0), d*thinFactor, v_barycentric);
    vec3 fatEdge = smoothstep(vec3(0.0), d*fatFactor, v_barycentric);
    
    if (u_quads) {
        thinEdge.g = 1.0;
        fatEdge.g = 1.0;
    }
    
    float fat = fatFactor * (1.0 - min(min(fatEdge.r, fatEdge.g), fatEdge.b));
    float thin = thinFactor * (1.0 - min(min(thinEdge.r, thinEdge.g), thinEdge.b));
    
    vec3 normal = normalize(v_normal);
    
    if (u_front) {
        thin = 1.0 - thin;
        gl_FragColor = vec4(0.99 * thin, 0.96 * thin, 0.70 * thin, fat);
    } else {
        gl_FragColor = vec4(0.5, 0.5, 0.5, thin);
    }
}
