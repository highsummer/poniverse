#version 300 es

precision highp float;

in vec2 a_position;
out vec2 fragTextureCoordinate;

void main() {
    gl_Position = vec4(a_position.x * 2.0 - 1.0, a_position.y * 2.0 - 1.0, 0.0, 1.0);
    fragTextureCoordinate = a_position;
}