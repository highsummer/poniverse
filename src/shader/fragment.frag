#version 300 es

precision highp float;

uniform float ambient;
uniform sampler2D meshTexture;
uniform float alphaThreshold;
in vec3 fragLightingNormal;
in vec3 fragPhysicalNormal;
in vec3 fragPosition;
in vec4 fragColor;
in vec2 fragTextureCoordinate;
layout(location = 0) out vec4 outFragment;
layout(location = 1) out vec4 outPosition;
layout(location = 2) out vec4 outNormal;

void main() {
    vec4 color = texture(meshTexture, fragTextureCoordinate) * fragColor;

    float intensity = (1.0 - ambient) * max(fragLightingNormal.z, 0.0) + ambient;

    if (color.a < 0.25) {
        discard;
    }
    outFragment = vec4(color.rgb * intensity * color.a, color.a);
    outPosition = vec4(fragPosition, 1.0);
    outNormal = vec4(normalize(fragPhysicalNormal), 1.0);
}