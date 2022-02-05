#version 300 es

precision highp float;

uniform sampler2D textureOutline;
in vec2 fragTextureCoordinate;
out vec4 outFragment;

void main() {
    outFragment = vec4(0.0, 0.0, 0.0, texture(textureOutline, fragTextureCoordinate).x);
}