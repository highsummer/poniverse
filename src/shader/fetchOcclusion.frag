#version 300 es

#define BOX_SIZE 5
#define SAMPLES (BOX_SIZE * BOX_SIZE)

precision highp float;

uniform sampler2D textureOcclusion;
uniform sampler2D texturePosition;
uniform vec2 screenSize;
uniform float blurScale;
uniform vec3 shadeColor;
in vec2 fragTextureCoordinate;
out vec4 outFragment;

const float distLimit = 0.4;
const vec2 correctionRange = vec2(0.0, 0.25);
const float intensity = 0.5;
const float gamma = 1.2;

void main() {
    vec3 position = texture(texturePosition, fragTextureCoordinate).xyz;

    float occlusion = 0.0;
    float numSamples = 0.0;
    for (int i = -BOX_SIZE / 2; i <= BOX_SIZE / 2; i++) {
        for (int j = -BOX_SIZE / 2; j <= BOX_SIZE / 2; j++) {
            vec2 dUV = vec2(float(j), float(i)) / screenSize / position.z * blurScale;
            vec3 positionOther = texture(texturePosition, fragTextureCoordinate + dUV).xyz;
            occlusion += texture(textureOcclusion, fragTextureCoordinate + dUV).x;
        }
    }
    occlusion /= float(SAMPLES);
    occlusion = clamp(pow((occlusion - correctionRange.x) / (correctionRange.y - correctionRange.x), gamma), 0.0, 1.0) * intensity;

    outFragment = vec4(shadeColor * occlusion, occlusion);
}