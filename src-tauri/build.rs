fn main() {
    #[cfg(target_os = "windows")]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let mpv_dir = format!("{}\\mpv", manifest_dir);
        let mpv_include = format!("{}\\mpv\\include", manifest_dir);

        println!("cargo:rustc-link-search=native={}", mpv_dir);
        println!("cargo:rustc-link-lib=mpv");
        unsafe {
            std::env::set_var("MPV_INCLUDE_DIR", &mpv_include);
            std::env::set_var("MPV_LIB_DIR", &mpv_dir);
        }
    }

    tauri_build::build();
}
