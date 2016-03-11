precision mediump float;

attribute vec4 a_position_model;
attribute vec3 a_normal;
attribute vec3 a_barycentric;

varying vec3 v_position_model;
varying vec3 v_normal;
varying vec3 v_barycentric;

uniform mat4 u_modelView, u_projection;

void main() {
    v_position_model = a_position_model.xyz / a_position_model.w;
    v_normal = a_normal;
    v_barycentric = a_barycentric;
    gl_Position = u_projection * u_modelView * a_position_model;
}
