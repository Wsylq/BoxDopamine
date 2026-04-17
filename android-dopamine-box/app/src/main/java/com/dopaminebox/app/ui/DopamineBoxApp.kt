package com.dopaminebox.app.ui

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.dopaminebox.app.model.FeedEvent
import com.dopaminebox.app.model.MiniGameType
import com.dopaminebox.app.ui.games.CoinFlipGame
import com.dopaminebox.app.ui.games.FlappyCoinsGame
import com.dopaminebox.app.ui.games.HigherLowerGame
import com.dopaminebox.app.ui.games.PlinkoGame
import com.dopaminebox.app.ui.theme.DopamineBorder
import com.dopaminebox.app.ui.theme.DopaminePrimary
import com.dopaminebox.app.ui.theme.DopamineTextPrimary
import com.dopaminebox.app.ui.theme.DopamineTextSecondary
import com.dopaminebox.app.ui.theme.DopamineTheme
import com.dopaminebox.app.util.Haptics
import com.dopaminebox.app.util.SoundManager
import com.dopaminebox.app.viewmodel.DopamineViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.max

@Composable
fun DopamineBoxApp(vm: DopamineViewModel = viewModel()) {
    val context = LocalContext.current
    val haptics = remember { Haptics(context) }
    val sounds = remember { SoundManager() }
    val scope = rememberCoroutineScope()

    val playerState by vm.playerState.collectAsState()
    val feed by vm.feed.collectAsState()
    val streakWarning by vm.streakWarning.collectAsState()
    val showJackpot by vm.showJackpotCelebration.collectAsState()

    val pagerState = rememberPagerState(pageCount = { feed.size })
    var flashColor by remember { mutableStateOf(Color.Transparent) }
    var showFlash by remember { mutableStateOf(false) }
    var lastPageChangeNanos by remember { mutableLongStateOf(0L) }
    val hudScale = remember { Animatable(1f) }

    LaunchedEffect(streakWarning) {
        if (streakWarning) {
            Toast.makeText(context, "Streak in danger!", Toast.LENGTH_SHORT).show()
            vm.consumeStreakWarning()
        }
    }

    LaunchedEffect(showJackpot) {
        if (showJackpot) {
            haptics.woohoo()
            sounds.woohoo()
        }
    }

    LaunchedEffect(playerState.coins) {
        if (playerState.lastReward > 0) {
            hudScale.snapTo(1.07f)
            hudScale.animateTo(1f, animationSpec = spring())
        }
    }

    LaunchedEffect(pagerState.currentPage) {
        val page = pagerState.currentPage
        vm.ensureFeedForIndex(page)
        val now = System.nanoTime()
        if (lastPageChangeNanos != 0L) {
            val deltaMs = max(1L, (now - lastPageChangeNanos) / 1_000_000L)
            val pagesPerSecond = (1000f / deltaMs).coerceIn(0f, 8f)
            vm.accelerateFeed(pagesPerSecond)
            if (pagesPerSecond > 2.5f) haptics.scrollFastTick()
        }
        lastPageChangeNanos = now
    }

    DopamineTheme {
        Box(modifier = Modifier.fillMaxSize()) {
            VerticalPager(
                state = pagerState,
                beyondViewportPageCount = 2,
                modifier = Modifier.fillMaxSize(),
            ) { page ->
                val event = feed.getOrNull(page) ?: return@VerticalPager
                Box(modifier = Modifier.fillMaxSize()) {
                    ReelBackground(event.gameType)
                    ReelPage(
                        event = event,
                        speedMultiplier = playerState.scrollSpeedMultiplier,
                        onWin = { reward ->
                            vm.onWin(reward)
                            haptics.win()
                            sounds.win()
                            sounds.coin()
                            flashColor = Color(0x4D22C55E)
                            showFlash = true
                            scope.launch {
                                delay(300)
                                showFlash = false
                            }
                        },
                        onLose = { penalty ->
                            vm.onLose(penalty)
                            haptics.lose()
                            sounds.lose()
                            flashColor = Color(0x4DEF4444)
                            showFlash = true
                            scope.launch {
                                delay(300)
                                showFlash = false
                                delay(700)
                                val nextPage = (page + 1).coerceAtMost(feed.lastIndex)
                                vm.ensureFeedForIndex(nextPage)
                                pagerState.animateScrollToPage(nextPage, animationSpec = tween(360, easing = FastOutSlowInEasing))
                            }
                        },
                        onWoohoo = {
                            haptics.woohoo()
                            sounds.woohoo()
                        },
                    )
                }
            }

            HeaderHud(
                coins = playerState.coins,
                streak = playerState.streakDays,
                modifier = Modifier
                    .statusBarsPadding()
                    .padding(top = 10.dp)
                    .align(Alignment.TopCenter)
                    .scale(hudScale.value),
            )

            SwipeHint(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 26.dp),
            )

            AnimatedVisibility(visible = showFlash, modifier = Modifier.fillMaxSize()) {
                Box(modifier = Modifier.fillMaxSize().background(flashColor))
            }

            if (showJackpot) {
                JackpotOverlay(onDismiss = vm::consumeJackpotAndReset)
            }
        }
    }
}

@Composable
private fun ReelBackground(type: MiniGameType) {
    val transition = rememberInfiniteTransition(label = "bg")
    val t by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 7000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "shift",
    )
    val (start, end) = when (type) {
        MiniGameType.COIN_FLIP -> Color(0xFF7C3AED) to Color(0xFFDB2777)
        MiniGameType.HIGHER_LOWER -> Color(0xFF1D4ED8) to Color(0xFF06B6D4)
        MiniGameType.PLINKO -> Color(0xFF065F46) to Color(0xFF84CC16)
        MiniGameType.FLAPPY_COINS -> Color(0xFFEA580C) to Color(0xFFEAB308)
    }
    val first = start.copy(alpha = 0.95f)
    val second = Color(
        red = end.red * (0.82f + 0.18f * t),
        green = end.green,
        blue = end.blue * (0.85f + 0.15f * (1f - t)),
        alpha = 1f,
    )
    Box(modifier = Modifier.fillMaxSize().background(Brush.radialGradient(listOf(first, second))))
}

@Composable
private fun HeaderHud(coins: Long, streak: Int, modifier: Modifier = Modifier) {
    val pulse = rememberInfiniteTransition(label = "streak")
    val streakScale by pulse.animateFloat(
        initialValue = 1f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(animation = tween(700), repeatMode = RepeatMode.Reverse),
        label = "streak-pulse",
    )
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "Dopamine Box",
            color = Color.White,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 26.sp,
            modifier = Modifier
                .background(Brush.horizontalGradient(listOf(Color(0x6600FFFF), Color(0x66FF00FF))), RoundedCornerShape(100.dp))
                .padding(horizontal = 16.dp, vertical = 6.dp),
        )
        Box(
            modifier = Modifier
                .padding(top = 8.dp)
                .background(Color(0xAA000000), RoundedCornerShape(999.dp))
                .border(1.dp, DopamineBorder, RoundedCornerShape(999.dp))
                .padding(horizontal = 16.dp, vertical = 10.dp),
        ) {
            Text(
                text = "💰 $${String.format("%,d", coins)}",
                color = DopamineTextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
            )
        }
        Box(
            modifier = Modifier
                .padding(top = 8.dp)
                .scale(streakScale)
                .background(
                    brush = Brush.horizontalGradient(
                        if (streak > 0) listOf(Color(0xFFEF4444), Color(0xFFF97316)) else listOf(Color(0xFF6B7280), Color(0xFF4B5563)),
                    ),
                    shape = RoundedCornerShape(999.dp),
                )
                .padding(horizontal = 14.dp, vertical = 8.dp),
        ) {
            Text(
                text = if (streak > 0) "🔥 $streak" else "Start your streak!",
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun ReelPage(
    event: FeedEvent,
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    onWoohoo: () -> Unit,
) {
    val emoji = when (event.gameType) {
        MiniGameType.COIN_FLIP -> "🪙"
        MiniGameType.HIGHER_LOWER -> "🃏"
        MiniGameType.PLINKO -> "⚡"
        MiniGameType.FLAPPY_COINS -> "🐦"
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 108.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color(0x99000000), Color.Transparent))),
        ) {
            Column {
                Text(text = emoji, fontSize = 56.sp)
                Text(text = event.title, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Text(
                    text = event.subtitle,
                    color = DopamineTextSecondary,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(top = 2.dp, bottom = 10.dp),
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(Color.White.copy(alpha = 0.08f), RoundedCornerShape(24.dp))
                .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(24.dp))
                .padding(20.dp),
            contentAlignment = Alignment.Center,
        ) {
            when (event.gameType) {
                MiniGameType.COIN_FLIP -> CoinFlipGame(speedMultiplier, onWin, onLose)
                MiniGameType.HIGHER_LOWER -> HigherLowerGame(speedMultiplier, onWin, onLose)
                MiniGameType.PLINKO -> PlinkoGame(speedMultiplier, onWin, onLose)
                MiniGameType.FLAPPY_COINS -> FlappyCoinsGame(
                    speedMultiplier = speedMultiplier,
                    index = event.id.toInt(),
                    onWin = onWin,
                    onLose = onLose,
                    onWoohoo = onWoohoo,
                )
            }
        }
    }
}

@Composable
private fun SwipeHint(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "swipe")
    val bob by transition.animateFloat(
        initialValue = 0f,
        targetValue = 11f,
        animationSpec = infiniteRepeatable(animation = tween(900), repeatMode = RepeatMode.Reverse),
        label = "swipe-bob",
    )
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = modifier.offset(y = (-bob).dp)) {
        Text("↑", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Text("Swipe", color = Color.White, fontSize = 13.sp)
    }
}

@Composable
private fun JackpotOverlay(onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val alpha = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        alpha.animateTo(1f, animationSpec = tween(280))
    }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xD9000000))
            .alpha(alpha.value),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("YOU WIN THE BOX 🎊", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp)
            Text("Cashout reached \$10,000,000", color = Color.White)
            Box(
                modifier = Modifier
                    .background(Brush.horizontalGradient(listOf(DopaminePrimary, Color(0xFFF97316))), RoundedCornerShape(100.dp))
                    .padding(horizontal = 20.dp, vertical = 12.dp)
                    .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(100.dp))
                    .clickable(onClick = onDismiss),
            ) {
                Text(
                    text = "Collect + Restart",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 2.dp),
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            delay(1800)
            onDismiss()
        }
    }
}