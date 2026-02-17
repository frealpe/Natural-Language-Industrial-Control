#define RPIPLC_V6
#define RPIPLC_58

#include <napi.h>
#include <librpiplc/expanded-gpio.h>
#include <librpiplc/rpiplc.h>
#include "common.h"

// ---------------- Digital ----------------
Napi::Number WriteDigital(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2) return Napi::Number::New(env, -1);

    uint32_t pin = info[0].As<Napi::Number>().Uint32Value();
    uint8_t value = info[1].As<Napi::Number>().Uint32Value();

    pinMode(pin, OUTPUT);
    int res = digitalWrite(pin, value);

    return Napi::Number::New(env, res);
}

Napi::Number ReadDigital(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1) return Napi::Number::New(env, -1);

    uint32_t pin = info[0].As<Napi::Number>().Uint32Value();
    int res = digitalRead(pin);

    return Napi::Number::New(env, res);
}

// ---------------- ADC ----------------
Napi::Number ReadADC(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (numAnalogInputs == 0) return Napi::Number::New(env, -1);

    int channel = 0;
    if (info.Length() >= 1) {
        channel = info[0].As<Napi::Number>().Int32Value();
        if (channel < 0 || channel >= numAnalogInputs)
            return Napi::Number::New(env, -2);
    }

    // 12 bits directo, como en C
    uint16_t value = analogRead(analogInputs[channel]);
    return Napi::Number::New(env, value);
}
// ---------------- PWM ----------------
// ---------------- PWM ----------------
Napi::Number WritePWM(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (numAnalogOutputs == 0 || info.Length() < 2) {
        return Napi::Number::New(env, -1); // error: sin salidas o sin args
    }

    int channel = info[0].As<Napi::Number>().Int32Value();
    if (channel < 0 || channel >= numAnalogOutputs) {
        return Napi::Number::New(env, -2); // error: canal inválido
    }

    // 🔹 Cambiado a 12 bits (0–4095)
    uint16_t duty = info[1].As<Napi::Number>().Uint32Value();
    if (duty > 4095) duty = 4095;  // saturación

    analogWrite(analogOutputs[channel], duty);

    return Napi::Number::New(env, 0); // ok
}


// ---------------- Info ----------------
Napi::Object GetInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object obj = Napi::Object::New(env);

    obj.Set("numAnalogInputs", Napi::Number::New(env, numAnalogInputs));
    obj.Set("numAnalogOutputs", Napi::Number::New(env, numAnalogOutputs));

    return obj;
}

// ---------------- Init ----------------
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    initExpandedGPIO(false);

    exports.Set("writeDigital", Napi::Function::New(env, WriteDigital));
    exports.Set("readDigital", Napi::Function::New(env, ReadDigital));
    exports.Set("readADC", Napi::Function::New(env, ReadADC));
    exports.Set("writePWM", Napi::Function::New(env, WritePWM));
    exports.Set("getInfo", Napi::Function::New(env, GetInfo));

    return exports;
}

NODE_API_MODULE(rpiplc, Init)
