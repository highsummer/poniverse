#version 300 es

#define SAMPLE_NUM 16
#define FSAMPLE_NUM 16.0

precision highp float;

uniform sampler2D textureNormal;
uniform sampler2D texturePosition;
uniform sampler2D textureNoise;
uniform vec2 screenSize;
uniform float noiseSize;
in vec2 fragTextureCoordinate;
out float outOcclusion;

const vec3 sampleRadius = vec3(0.05, 0.05, 0.4);
const float distLimit = 0.8;
const vec2 correctionRange = vec2(0.625, 1.0);
const float gamma = 1.0;

const vec3 samplePoints[SAMPLE_NUM] =
    vec3[SAMPLE_NUM](
//        vec3(-0.71, -0.71, -0.71),
//        vec3(0.71, -0.71, -0.71),
//        vec3(-0.71, 0.71, -0.71),
//        vec3(0.71, 0.71, -0.71),
//        vec3(-0.71, -0.71, 0.71),
//        vec3(0.71, -0.71, 0.71),
//        vec3(-0.71, 0.71, 0.71),
//        vec3(-0.71, 0.71, 0.71)
        vec3(-0.73105, -0.123905, -0.603997),
        vec3(-0.644142, 0.0149198, 0.923938),
        vec3(-0.561841, -0.0872364, -0.564048),
        vec3(-0.329838, -0.553394, 0.331065),
        vec3(-0.226658, 0.025881, -0.252524),
        vec3(-0.202701, 0.318089, 0.193107),
        vec3(-0.0775235, -0.57199, -0.0573087),
        vec3(0.174895, 0.781756, 0.69674),
        vec3(0.421993, 0.513071, -0.0201336),
        vec3(0.459571, 0.630715, 0.0506995),
        vec3(0.555465, 0.109432, -0.030112),
        vec3(-0.868982, -0.415858, 0.0868412),
        vec3(-0.580376, 0.460583, -0.2247),
        vec3(-0.388384, 0.404592, 0.395835),
        vec3(-0.269678, 0.087303, -0.195931),
        vec3(-0.157603, -0.265732, 0.499082)
    );

void main() {
    vec3 noise = texture(textureNoise, fragTextureCoordinate * screenSize / noiseSize).xyz - 0.5;
    vec3 normal = texture(textureNormal, fragTextureCoordinate).xyz;
    vec3 tangent = normalize(cross(normal, noise));
    vec3 bitanget = cross(normal, tangent);
    mat3 tbn = mat3(tangent, bitanget, normal);

    vec3 position = vec4(texture(texturePosition, fragTextureCoordinate)).xyz;

    float occlusion = 0.0;
    for (int i = 0; i < SAMPLE_NUM; i++) {
        vec3 samplePoint = samplePoints[i];
        vec3 dPosition = tbn * samplePoint * sampleRadius;
        vec3 positionSample = position + dPosition;
        vec2 dUV = dPosition.xy / positionSample.z * 2.0;

        vec3 positionOther = texture(texturePosition, fragTextureCoordinate + dUV).xyz;
        occlusion += step(positionOther.z, positionSample.z) * step(positionSample.z - distLimit, positionOther.z) / FSAMPLE_NUM;
    }
    occlusion = clamp(pow((occlusion - correctionRange.x) / (correctionRange.y - correctionRange.x), gamma), 0.0, 1.0);
    outOcclusion = occlusion;
}