#version 300 es

precision highp float;

uniform sampler2D textureNormal;
uniform sampler2D texturePosition;
uniform float aspect;
in vec2 fragTextureCoordinate;
out vec4 outOcclusion;

const float unitDelta = 1.0 / 768.0;
const float distLimit = 0.1;
const vec2 correctionRange = vec2(0.1, 0.5);

#define PI 3.14159

vec3 normal;
vec3 position;
float occlusion = 0.0;

void addOcclusion(vec2 dUV, float weight) {
    dUV *= vec2(1.0 / aspect, 1.0) * unitDelta;
    vec3 normalOther = texture(textureNormal, fragTextureCoordinate + dUV).xyz;
    vec3 positionOther = texture(texturePosition, fragTextureCoordinate + dUV).xyz;

    occlusion += min(
        1.0,
        smoothstep(-1.0, -0.3, -dot(normal, normalOther)) +
        smoothstep(0.0, distLimit * position.z, abs(position.z - positionOther.z))
    ) * weight;
}

void main() {
    normal = texture(textureNormal, fragTextureCoordinate).xyz;
    position = texture(texturePosition, fragTextureCoordinate).xyz;

    addOcclusion(vec2(1.0, -2.0), 0.25);
    addOcclusion(vec2(0.0, -2.0), 0.25);
    addOcclusion(vec2(-1.0, -2.0), 0.25);
    addOcclusion(vec2(1.0, 2.0), 0.25);
    addOcclusion(vec2(0.0, 2.0), 0.25);
    addOcclusion(vec2(-1.0, 2.0), 0.25);
    addOcclusion(vec2(-2.0, -1.0), 0.25);
    addOcclusion(vec2(-2.0, 0.0), 0.25);
    addOcclusion(vec2(-2.0, 1.0), 0.25);
    addOcclusion(vec2(2.0, -1.0), 0.25);
    addOcclusion(vec2(2.0, 0.0), 0.25);
    addOcclusion(vec2(2.0, 1.0), 0.25);

    addOcclusion(vec2(-1.0, -1.0), 0.5);
    addOcclusion(vec2(1.0, -1.0), 0.5);
    addOcclusion(vec2(-1.0, 1.0), 0.5);
    addOcclusion(vec2(1.0, 1.0), 0.5);

    addOcclusion(vec2(0.0, 1.0), 1.0);
    addOcclusion(vec2(0.0, -1.0), 1.0);
    addOcclusion(vec2(1.0, 0.0), 1.0);
    addOcclusion(vec2(-1.0, 0.0), 1.0);

    occlusion /= 6.0;
    occlusion = clamp((occlusion - correctionRange.x) / (correctionRange.y - correctionRange.x), 0.0, 1.0);

    outOcclusion = vec4(vec3(occlusion * 0.6), 0.0);
//    outOcclusion = vec4(normal * 0.5 + 0.5, 1.0);
}