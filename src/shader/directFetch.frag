#version 300 es

precision highp float;

uniform sampler2D meshTexture;
in vec2 fragTextureCoordinate;
out vec4 outFragment;

void main() {
    outFragment = vec4(texture(meshTexture, fragTextureCoordinate).xyz, 1.0);
}