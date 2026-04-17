package com.dopaminebox.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dopaminebox.app.model.FeedEvent
import com.dopaminebox.app.model.MiniGameType
import com.dopaminebox.app.ui.games.CoinFlipGame
import com.dopaminebox.app.ui.games.FlappyCoinsGame
import com.dopaminebox.app.ui.games.HigherLowerGame
import com.dopaminebox.app.ui.games.PlinkoGame
import com.dopaminebox.app.util.Haptics
import com.dopaminebox.app.util.SoundManager
import com.dopaminebox.app.viewmodel.DopamineViewModel
import kotlin.math.max

@Composable
fun DopamineBoxApp(vm: DopamineViewModel = viewModel()) {
    val context = LocalContext.current
    val haptics = remember { Haptics(context) }
    val sounds = remember { SoundManager() }

    var lastScrollNanos by remember { mutableLongStateOf(0L) }
    var swipesPerSecond by remember { mutableFloatStateOf(0f) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(top = 28.dp)
    ) {
        Header(
            coins = vm.playerState.coins,
            streak = vm.playerState.streakDays,
            speed = vm.playerState.scrollSpeedMultiplier,
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            itemsIndexed(vm.feed, key = { _, event -> event.id }) { index, event ->
                val now = System.nanoTime()
                if (lastScrollNanos != 0L) {
                    val deltaMs = max(1L, (now - lastScrollNanos) / 1_000_000)
                    swipesPerSecond = (1000f / deltaMs).coerceIn(0f, 12f)
                    vm.accelerateFeed(swipesPerSecond)
                }
                lastScrollNanos = now

                FeedGameBlock(
                    event = event,
                    onWin = { reward ->
                        vm.onWin(reward)
                        haptics.win()
                        sounds.win()
                    },
                    onLose = { penalty ->
                        vm.onLose(penalty)
                        haptics.lose()
                        sounds.lose()
                    },
                    onWoohoo = {
                        haptics.win()
                        sounds.woohoo()
                    },
                    speedMultiplier = vm.playerState.scrollSpeedMultiplier,
                    index = index,
                )
            }
        }
    }

    LaunchedEffect(swipesPerSecond) {
        if (swipesPerSecond > 4.5f) haptics.tap()
    }
}

@Composable
private fun Header(coins: Long, streak: Int, speed: Float) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text(
            text = "Dopamine Box",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "Coins: $$coins   |   Streak: $streak days   |   Speed x${"%.1f".format(speed)}",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
        )
    }
}

@Composable
private fun FeedGameBlock(
    event: FeedEvent,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    onWoohoo: () -> Unit,
    speedMultiplier: Float,
    index: Int,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, MaterialTheme.shapes.extraLarge)
            .padding(16.dp)
    ) {
        Text(event.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Text(event.subtitle, style = MaterialTheme.typography.bodyMedium)
        AnimatedContent(
            targetState = event.gameType,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "game-switch"
        ) { game ->
            when (game) {
                MiniGameType.COIN_FLIP -> CoinFlipGame(speedMultiplier = speedMultiplier, onWin = onWin, onLose = onLose)
                MiniGameType.HIGHER_LOWER -> HigherLowerGame(speedMultiplier = speedMultiplier, onWin = onWin, onLose = onLose)
                MiniGameType.PLINKO -> PlinkoGame(speedMultiplier = speedMultiplier, onWin = onWin, onLose = onLose)
                MiniGameType.FLAPPY_COINS -> FlappyCoinsGame(
                    speedMultiplier = speedMultiplier,
                    index = index,
                    onWin = onWin,
                    onLose = onLose,
                    onWoohoo = onWoohoo,
                )
            }
        }
    }
}