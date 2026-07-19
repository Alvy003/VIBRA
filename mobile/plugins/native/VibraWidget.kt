package com.vibra.mobile.widget

import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.DpSize
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.glance.unit.ColorProvider
import java.io.File
import com.vibra.mobile.R

class VibraWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        android.util.Log.d("VibraWidget", "provideGlance: triggered for GlanceId: $id")
        provideContent {
            val prefs = context.getSharedPreferences("vibra_widget_prefs", Context.MODE_PRIVATE)
            val title = prefs.getString("title", "") ?: ""
            val artist = prefs.getString("artist", "") ?: ""
            val artworkUri = prefs.getString("artworkUri", "") ?: ""
            val isPlaying = prefs.getBoolean("isPlaying", false)

            val size = LocalSize.current

            android.util.Log.d("VibraWidget", "provideGlance: read prefs - title='$title', artist='$artist', isPlaying=$isPlaying, artworkUri='$artworkUri', size=$size")

            GlanceTheme {
                WidgetContent(context, title, artist, artworkUri, isPlaying, size)
            }
        }
    }

    @Composable
    private fun WidgetContent(
        context: Context,
        rawTitle: String,
        rawArtist: String,
        artworkUri: String,
        isPlaying: Boolean,
        size: DpSize
    ) {
        android.util.Log.d("VibraWidget", "WidgetContent recomposing: rawTitle='$rawTitle', rawArtist='$rawArtist', isPlaying=$isPlaying, artworkUri='$artworkUri', size=$size")
        // Handle empty state defaults
        val isEmpty = rawTitle.isEmpty()
        val title = if (isEmpty) "Not Playing" else rawTitle
        val artist = if (isEmpty) "Tap to open Vibra" else rawArtist

        // Vibra dark brand color palette
        val backgroundColor = ColorProvider(Color(0xFF040405)) // Pure deep carbon black
        val borderColor = Color(0xFF1E1E24) // Subtle layout outline border
        val primaryTextColor = ColorProvider(Color.White)
        val secondaryTextColor = ColorProvider(Color(0xFF71717A)) // Zinc 400
        val brandColor = ColorProvider(Color(0xFF7F00FF)) // Vibra Hot Purple Accent

        // Resolve artwork bitmap
        val bitmap = try {
            if (artworkUri.isNotEmpty()) {
                val file = File(artworkUri)
                val exists = file.exists()
                android.util.Log.d("VibraWidget", "WidgetContent: artworkUri file exists=$exists path='${file.absolutePath}'")
                if (exists) {
                    BitmapFactory.decodeFile(file.absolutePath)
                } else null
            } else {
                android.util.Log.d("VibraWidget", "WidgetContent: artworkUri is empty")
                null
            }
        } catch (e: Exception) {
            android.util.Log.e("VibraWidget", "WidgetContent: failed decoding artwork", e)
            null
        }

        // Open App Intent
        val openAppIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val openAppAction = openAppIntent?.let { intent ->
            androidx.glance.appwidget.action.actionStartActivity(intent)
        }

        val isSmall = size.height.value < 85f
        
        val outerPaddingVertical = if (isSmall) 6.dp else 12.dp
        val outerPaddingHorizontal = if (isSmall) 10.dp else 12.dp
        val artworkSize = if (isSmall) 56.dp else 72.dp
        val placeholderIconSize = if (isSmall) 28.dp else 36.dp
        val titleSize = if (isSmall) 13.sp else 15.sp
        val artistSize = if (isSmall) 11.sp else 12.sp
        val logoSize = if (isSmall) 16.dp else 18.dp
        val playButtonSize = if (isSmall) 36.dp else 42.dp
        val playButtonRadius = if (isSmall) 18.dp else 21.dp
        val playIconSize = if (isSmall) (if (isPlaying) 14.dp else 16.dp) else (if (isPlaying) 18.dp else 20.dp)
        val controlButtonSize = if (isSmall) 32.dp else 36.dp
        val controlIconSize = if (isSmall) 20.dp else 24.dp
        val controlSpacing = if (isSmall) 12.dp else 20.dp

        val baseModifier = GlanceModifier
            .fillMaxSize()
            .background(backgroundColor)
            .cornerRadius(16.dp)

        Box(
            modifier = baseModifier,
            contentAlignment = Alignment.Center
        ) {
            // Single adaptive layout
            Row(
                modifier = GlanceModifier.fillMaxSize().padding(
                    horizontal = outerPaddingHorizontal,
                    vertical = outerPaddingVertical
                ),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 1. Large Artwork Thumbnail
                val artworkModifier = if (openAppAction != null) GlanceModifier.clickable(openAppAction) else GlanceModifier

                if (bitmap != null) {
                    Image(
                        provider = ImageProvider(bitmap),
                        contentDescription = "Artwork",
                        modifier = artworkModifier
                            .size(artworkSize)
                            .cornerRadius(12.dp),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = artworkModifier
                            .size(artworkSize)
                            .background(ColorProvider(Color(0xFF18181C)))
                            .cornerRadius(12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            provider = ImageProvider(R.drawable.ic_sharp_play),
                            contentDescription = "Placeholder",
                            modifier = GlanceModifier.size(placeholderIconSize),
                            colorFilter = ColorFilter.tint(secondaryTextColor)
                        )
                    }
                }

                Spacer(modifier = GlanceModifier.width(12.dp))

                // 2. Info & Controls Column (Flexible)
                Column(
                    modifier = GlanceModifier.defaultWeight().fillMaxHeight(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Top Row: Metadata + Logo
                    val topRowModifier = if (openAppAction != null) GlanceModifier.clickable(openAppAction) else GlanceModifier
                    Row(
                        modifier = topRowModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(
                            modifier = GlanceModifier.defaultWeight()
                        ) {
                            Text(
                                text = title,
                                style = TextStyle(
                                    color = primaryTextColor,
                                    fontSize = titleSize,
                                    fontWeight = FontWeight.Bold
                                ),
                                maxLines = 1
                            )
                            Spacer(modifier = GlanceModifier.height(2.dp))
                            Text(
                                text = artist,
                                style = TextStyle(
                                    color = secondaryTextColor,
                                    fontSize = artistSize
                                ),
                                maxLines = 1
                            )
                        }

                        Spacer(modifier = GlanceModifier.width(8.dp))

                        // Subtle Vibra logo icon
                        Image(
                            provider = ImageProvider(R.drawable.ic_vibra_logo),
                            contentDescription = "Vibra Logo",
                            modifier = GlanceModifier.size(logoSize)
                        )
                    }

                    Spacer(modifier = GlanceModifier.height(if (isSmall) 4.dp else 8.dp))

                    // Bottom Row: Centered Transport Controls
                    // Wrap in a full-width Box so the inner Row measures to its
                    // natural content size (sum of fixed children + spacers) and
                    // is centered without any child being stretched by the parent
                    // LinearLayout when the widget is compact.
                    Box(
                        modifier = GlanceModifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(
                            modifier = GlanceModifier, // no fillMaxWidth — natural size only
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Previous Button
                            Box(
                                modifier = GlanceModifier
                                    .size(controlButtonSize)
                                    .clickable(actionRunCallback<PreviousCallback>()),
                                contentAlignment = Alignment.Center
                            ) {
                                Image(
                                    provider = ImageProvider(R.drawable.ic_sharp_prev),
                                    contentDescription = "Previous",
                                    modifier = GlanceModifier.size(controlIconSize),
                                    colorFilter = ColorFilter.tint(primaryTextColor)
                                )
                            }

                            Spacer(modifier = GlanceModifier.width(controlSpacing))

                            // Play/Pause button (White dominant circle)
                            Box(
                                modifier = GlanceModifier
                                    .size(playButtonSize)
                                    .background(ColorProvider(Color.White))
                                    .cornerRadius(playButtonRadius)
                                    .clickable(actionRunCallback<PlayPauseCallback>()),
                                contentAlignment = Alignment.Center
                            ) {
                                val playPauseIcon = if (isPlaying) R.drawable.ic_sharp_pause else R.drawable.ic_sharp_play
                                Image(
                                    provider = ImageProvider(playPauseIcon),
                                    contentDescription = "Play/Pause",
                                    modifier = GlanceModifier.size(playIconSize),
                                    colorFilter = ColorFilter.tint(ColorProvider(Color.Black))
                                )
                            }

                            Spacer(modifier = GlanceModifier.width(controlSpacing))

                            // Next Button
                            Box(
                                modifier = GlanceModifier
                                    .size(controlButtonSize)
                                    .clickable(actionRunCallback<NextCallback>()),
                                contentAlignment = Alignment.Center
                            ) {
                                Image(
                                    provider = ImageProvider(R.drawable.ic_sharp_next),
                                    contentDescription = "Next",
                                    modifier = GlanceModifier.size(controlIconSize),
                                    colorFilter = ColorFilter.tint(primaryTextColor)
                                )
                            }
                        }
                    }

                }
            }
        }
    }
}

