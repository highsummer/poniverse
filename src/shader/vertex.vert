#version 300 es

precision highp float;

uniform mat4 viewMatrix;
uniform mat4 worldMatrix;
uniform vec3 warpSingularity;
uniform vec4 warpPlane;
uniform float warpRadius;
in vec3 a_position;
in vec3 a_normal;
in vec4 a_color;
in vec2 a_textureCoordinate;
out vec3 fragLightingNormal;
out vec3 fragPhysicalNormal;
out vec3 fragPosition;
out vec4 fragColor;
out vec2 fragTextureCoordinate;

const float zNear = 0.1;
const float zFar = 100.0;
const float Pi = 3.1415926;
const float epsilon = 0.001;

vec4 warp(vec4 worldPosition) {
    vec3 relativePosition = worldPosition.xyz - warpSingularity;

    vec3 warpNormal = -normalize(warpPlane.xyz);
    vec3 warpTangent = normalize(cross(warpNormal, vec3(0.0, -1.0, 0.0)));
    vec3 warpBitangent = cross(warpNormal, warpTangent);
    mat3 warpJacobian = mat3(warpTangent, warpBitangent, warpNormal);

    float radius = dot(warpNormal, relativePosition);
    float thetaTangent = dot(warpTangent, relativePosition) / warpRadius;
    float thetaBitangent = dot(warpBitangent, relativePosition) / warpRadius;

    vec4 warpPosition = vec4(
        sin(clamp(thetaTangent, -Pi, Pi)) * radius,
        sin(clamp(thetaBitangent, -Pi, Pi)) * radius,
        cos(clamp(thetaTangent, -Pi, Pi)) * cos(clamp(thetaBitangent, -Pi, Pi)) * radius,
        1.0
    ) + vec4(warpSingularity, 0.0);

    return warpPosition;
}

void main() {
    vec4 worldPosition = worldMatrix * vec4(a_position, 1.0);
    vec4 warpPosition = warp(worldPosition);
    vec4 warpDeltaX = warp(worldPosition + vec4(epsilon, 0.0, 0.0, 0.0));
    vec4 warpDeltaY = warp(worldPosition + vec4(0.0, epsilon, 0.0, 0.0));
    vec4 warpDeltaZ = warp(worldPosition + vec4(0.0, 0.0, epsilon, 0.0));
    mat3 warpNormalMat = mat3(
        (warpDeltaX - warpPosition).xyz,
        (warpDeltaY - warpPosition).xyz,
        (warpDeltaZ - warpPosition).xyz
    );

    gl_Position = viewMatrix * warpPosition;
    fragLightingNormal = normalize(mat3(worldMatrix) * a_normal);
    fragPhysicalNormal = -normalize(warpNormalMat * mat3(worldMatrix) * a_normal);
    fragPosition = vec3(viewMatrix * worldPosition);
    fragColor = a_color;
    fragTextureCoordinate = a_textureCoordinate;
}

