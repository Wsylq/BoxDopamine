package com.dopaminebox.app.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.dopaminebox.app.model.FeedEvent
import com.dopaminebox.app.model.MiniGameType
import com.dopaminebox.app.model.PlayerState
import kotlin.math.max
import kotlin.random.Random

class DopamineViewModel : ViewModel() {
    var playerState by mutableStateOf(PlayerState())
        private set

    var feed by mutableStateOf(seedFeed())
        private set

    fun accelerateFeed(swipesPerSecond: Float) {
        playerState = playerState.copy(
            scrollSpeedMultiplier = (1f + swipesPerSecond / 4f).coerceIn(1f, 3.5f)
        )
    }

    fun onWin(reward: Long) {
        playerState = playerState.copy(
            coins = playerState.coins + reward,
            lastReward = reward,
            streakDays = playerState.streakDays + if (Random.nextFloat() > 0.7f) 1 else 0,
        )
        maybeAppendFeed()
    }

    fun onLose(penalty: Long) {
        val nextCoins = max(0L, playerState.coins - penalty)
        playerState = playerState.copy(coins = nextCoins, lastReward = -penalty)
        maybeAppendFeed(extraDepth = 4)
    }

    fun resetRun() {
        playerState = playerState.copy(coins = 1_000, lastReward = 0, scrollSpeedMultiplier = 1f)
        feed = seedFeed()
    }

    private fun maybeAppendFeed(extraDepth: Int = 2) {
        val nextId = (feed.lastOrNull()?.id ?: 0L) + 1
        val additions = List(extraDepth) { index ->
            val game = MiniGameType.entries.random()
            FeedEvent(
                id = nextId + index,
                title = when (game) {
                    MiniGameType.COIN_FLIP -> "Coin Flip Rush"
                    MiniGameType.HIGHER_LOWER -> "Higher or Lower"
                    MiniGameType.PLINKO -> "Plinko Drop"
                    MiniGameType.FLAPPY_COINS -> "Flappy Coins"
                },
                subtitle = "Win big and keep scrolling",
                gameType = game,
            )
        }
        feed = feed + additions
    }

    private fun seedFeed(): List<FeedEvent> = List(12) { i ->
        val game = MiniGameType.entries[i % MiniGameType.entries.size]
        FeedEvent(
            id = i.toLong(),
            title = "Dopamine Round ${i + 1}",
            subtitle = "One tap away from a bigger hit",
            gameType = game,
        )
    }
}