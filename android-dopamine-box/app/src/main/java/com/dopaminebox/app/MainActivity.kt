package com.dopaminebox.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.dopaminebox.app.ui.DopamineBoxApp
import com.dopaminebox.app.ui.theme.DopamineTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DopamineTheme {
                DopamineBoxApp()
            }
        }
    }
}