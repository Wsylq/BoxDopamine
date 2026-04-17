package com.dopaminebox.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.max

@Composable
@OptIn(ExperimentalFoundationApi::class)
fun DopamineBoxApp(vm: DopamineViewModel = viewModel()) {
    val context = LocalContext.current
    val haptics = remember { Haptics(context) }
    val sounds = remember { SoundManager() }
    val pagerState = rememberPagerState(pageCount = { vm.feed.size })
    val scope = rememberCoroutineScope()

    var lastPageChangeNanos by remember { mutableLongStateOf(0L) }
    var pagesPerSecond by remember { mutableFloatStateOf(0f) }
    var activePage by remember { mutableIntStateOf(0) }
    var flashMessage by remember { mutableStateOf<String?>(null) }

    fun celebrate(message: String) {
        flashMessage = message
        scope.launch {
            delay(800)
            flashMessage = null
        }
    }

    fun moveToNextOnLoss(currentPage: Int) {
        vm.ensureFeedForIndex(currentPage + 2)
        scope.launch {
            val nextPage = (currentPage + 1).coerceAtMost(vm.feed.lastIndex)
            if (pagerState.currentPage != nextPage) {
                pagerState.animateScrollToPage(nextPage)
            }
        }
    }

    LaunchedEffect(pagerState.currentPage) {
        activePage = pagerState.currentPage
        vm.ensureFeedForIndex(pagerState.currentPage + 3)

        val now = System.nanoTime()
        if (lastPageChangeNanos != 0L) {
            val deltaMs = max(1L, (now - lastPageChangeNanos) / 1_000_000)
            pagesPerSecond = (1000f / deltaMs).coerceIn(0f, 8f)
            vm.accelerateFeed(pagesPerSecond)
            if (pagesPerSecond > 2.5f) haptics.tap()
        }
        lastPageChangeNanos = now
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        VerticalPager(
            state = pagerState,
            beyondViewportPageCount = 1,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            val event = vm.feed[page]
            ReelPage(
                event = event,
                page = page,
                speedMultiplier = vm.playerState.scrollSpeedMultiplier,
                onWin = { reward ->
                    vm.onWin(reward)
                    haptics.win()
                    sounds.win()
                    celebrate("+\$$reward")
                },
                onLose = { penalty ->
                    vm.onLose(penalty)
                    haptics.lose()
                    sounds.lose()
                    celebrate("-\$$penalty")
                    moveToNextOnLoss(page)
                },
                onWoohoo = {
                    haptics.win()
                    sounds.woohoo()
                    celebrate("Woohoo!")
                },
            )
        }

        OverlayHeader(
            coins = vm.playerState.coins,
            streak = vm.playerState.streakDays,
            speed = vm.playerState.scrollSpeedMultiplier,
            page = activePage,
            modifier = Modifier
                .statusBarsPadding()
                .align(Alignment.TopStart)
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 10.dp),
        )

        AnimatedVisibility(
            visible = flashMessage != null,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it / 2 }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { -it / 2 }),
            modifier = Modifier
                .align(Alignment.Center)
                .padding(20.dp),
        ) {
            Text(
                text = flashMessage.orEmpty(),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun OverlayHeader(
    coins: Long,
    streak: Int,
    speed: Float,
    page: Int,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = "Dopamine Box",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "\$$coins | Streak $streak | Speed x${"%.1f".format(speed)} | Reel ${page + 1}",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.9f),
        )
    }
}

@Composable
private fun ReelPage(
    event: FeedEvent,
    page: Int,
    speedMultiplier: Float,
    onWin: (Long) -> Unit,
    onLose: (Long) -> Unit,
    onWoohoo: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 18.dp, vertical = 116.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = event.title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = event.subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentAlignment = Alignment.Center,
        ) {
            when (event.gameType) {
                MiniGameType.COIN_FLIP -> CoinFlipGame(
                    speedMultiplier = speedMultiplier,
                    onWin = onWin,
                    onLose = onLose,
                )

                MiniGameType.HIGHER_LOWER -> HigherLowerGame(
                    speedMultiplier = speedMultiplier,
                    onWin = onWin,
                    onLose = onLose,
                )

                MiniGameType.PLINKO -> PlinkoGame(
                    speedMultiplier = speedMultiplier,
                    onWin = onWin,
                    onLose = onLose,
                )

                MiniGameType.FLAPPY_COINS -> FlappyCoinsGame(
                    speedMultiplier = speedMultiplier,
                    index = page,
                    onWin = onWin,
                    onLose = onLose,
                    onWoohoo = onWoohoo,
                )
            }
        }

        Text(
            text = "Swipe up for next reel",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
        )
    }
}