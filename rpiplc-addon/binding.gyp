{
  "targets": [
    {
      "target_name": "rpiplc",
      "sources": ["rpiplc_wrapper.cpp"],
      "include_dirs": [
        "node_modules/node-addon-api",
        "/usr/local/include/librpiplc"
      ],
      "libraries": [
        "-lrpiplc"
      ],
      "cflags": ["-Wall"],
      "cflags_cc": ["-std=c++17", "-fexceptions"],
      "defines": [
        "NAPI_CPP_EXCEPTIONS",
        "RPIPLC_V6",
        "RPIPLC_58"
      ]
    }
  ]
}

