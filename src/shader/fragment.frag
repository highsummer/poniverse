#version 300 es

precision highp float;

uniform float ambient;
uniform sampler2D meshTexture;
uniform sampler2D alphaMask;
uniform vec2 screenSize;
uniform float alphaMaskSize;
uniform float aspect;
uniform mat4 viewMatrix;
uniform float hiderPivotDepth;
in vec3 fragLightingNormal;
in vec3 fragPhysicalNormal;
in vec3 fragPosition;
in vec4 fragColor;
in vec2 fragTextureCoordinate;
layout(location = 0) out vec4 outFragment;
layout(location = 1) out vec4 outPosition;
layout(location = 2) out vec4 outNormal;

const vec3 hiderNormal = normalize(vec3(0.0, -0.04, 1.0));
const vec3 hiderTangent = normalize(cross(hiderNormal, vec3(0.0, 1.0, 0.0)));
const vec3 hiderBiangent = cross(hiderNormal, hiderTangent);
const mat3 hiderSpace = mat3(hiderTangent, hiderBiangent, hiderNormal);

void main() {
    vec4 color = texture(meshTexture, fragTextureCoordinate) * fragColor;
    vec3 normalizedPosition = vec3((gl_FragCoord.xy / screenSize * 2.0 - 1.0) * vec2(aspect, 1.0), fragPosition.z - hiderPivotDepth);
    vec3 hiderPosition = hiderSpace * normalizedPosition;

    float intensity = (1.0 - ambient) * max(fragLightingNormal.z, 0.0) + ambient;
    float alphaThreshold = texture(alphaMask, gl_FragCoord.xy / alphaMaskSize).x;

    float positionRadius = (
        hiderPosition.x * hiderPosition.x * 0.8 +
        hiderPosition.y * hiderPosition.y * 1.2
    ) * 10.0;
    float hiderDepth = -hiderPosition.z * step(hiderPosition.z, -0.2);

    float alphaMultipler = smoothstep(hiderDepth * 0.5, hiderDepth, positionRadius);

    if (color.a * alphaMultipler < alphaThreshold) {
        discard;
    }
    outFragment = vec4(color.rgb * intensity * color.a, color.a);
    outPosition = vec4(fragPosition, 1.0);
    outNormal = vec4(normalize(fragPhysicalNormal), 1.0);
}