package com.bottle.ismism_trace

import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private lateinit var wv: WebView

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    wv = webView
  }

  private val keyEventMap = mapOf(
    KeyEvent.KEYCODE_BACK to "back",
    KeyEvent.KEYCODE_MENU to "menu",
    KeyEvent.KEYCODE_SEARCH to "search",
    KeyEvent.KEYCODE_VOLUME_DOWN to "volume_down",
    KeyEvent.KEYCODE_VOLUME_UP to "volume_up"
  )

  @Volatile
  private var backKeyPending = false

  private fun handleBackKey(callback: (handled: Boolean) -> Unit) {
    if (backKeyPending) return
    backKeyPending = true
    wv.evaluateJavascript(
      """
      try {
        window.__tauri_android_on_back_key_down__()
      } catch (_) {
        true
      }
      """.trimIndent()
    ) { result ->
      // 延迟重置，避免同一次返回键先后触发 onKeyDown 和 onBackPressed 时跑两次 JS
      wv.postDelayed({ backKeyPending = false }, 200)
      val handled = result?.trim()?.removeSurrounding("\"") == "false"
      callback(handled)
    }
  }

  override fun onBackPressed() {
    handleBackKey { handled ->
      if (!handled) {
        finish()
      }
    }
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_BACK) {
      handleBackKey { handled ->
        if (!handled) {
          finish()
        }
      }
      return true
    }
    val jsCallbackName = keyEventMap[keyCode]
    wv.evaluateJavascript(
      """
      try {
        window.__tauri_android_on_${if (jsCallbackName != null) "${jsCallbackName}_" else ""}key_down__(${if (jsCallbackName != null) "" else keyCode})
      } catch (_) {
        true
      }
      """.trimIndent()
    ) { result ->
      if (result?.trim() != "false") {
        super.onKeyDown(keyCode, event)
      }
    }
    return true
  }
}
