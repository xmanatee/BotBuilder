﻿// 
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
// 
// Microsoft Bot Framework: http://botframework.com
// 
// Bot Builder SDK Github:
// https://github.com/Microsoft/BotBuilder
// 
// Copyright (c) Microsoft Corporation
// All rights reserved.
// 
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

using Microsoft.Bot.Builder.Internals.Fibers;
using Microsoft.Bot.Builder.Internals.Scorables;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.Bot.Builder.Tests
{
    public abstract class ScorableTestBase
    {
        public static Mock<IScorable<Item, Score>> Mock<Item, Score>(Item item, Score score, CancellationToken token, bool hasScore)
        {
            object state = new object();

            var mock = new Mock<IScorable<Item, Score>>(MockBehavior.Strict);
            mock.Setup(s => s.PrepareAsync(item, token)).Returns(Task.FromResult(state));
            mock.Setup(s => s.HasScore(item, state)).Returns(hasScore);
            mock.Setup(s => s.GetScore(item, state)).Returns(score);
            mock.Setup(s => s.PostAsync(item, state, token)).Returns(Task.CompletedTask);
            mock.Setup(s => s.DoneAsync(item, state, token)).Returns(Task.CompletedTask);

            return mock;
        }

        public static void Verify<Item, Score>(Mock<IScorable<Item, Score>> mock, Item item, CancellationToken token, Times prepare, Times hasScore, Times getScore, Times post)
        {
            mock.Verify(s => s.PrepareAsync(item, token), prepare);
            mock.Verify(s => s.HasScore(item, It.IsAny<object>()), hasScore);
            mock.Verify(s => s.GetScore(item, It.IsAny<object>()), getScore);
            mock.Verify(s => s.PostAsync(item, It.IsAny<object>(), token), post);
            mock.Verify(s => s.DoneAsync(item, It.IsAny<object>(), token), prepare);
        }
    }

    [TestClass]
    public sealed class ScorableTests : ScorableTestBase
    {
        public static readonly string Item = "hello";
        public static readonly double Score = 1.0;
        public static readonly CancellationToken Token = new CancellationTokenSource().Token;

        public static Times Once(bool proposition)
        {
            return proposition ? Times.Once() : Times.Never();
        }

        public static Times Many(bool proposition)
        {
            return proposition ? Times.AtLeastOnce() : Times.Never();
        }

        [TestMethod]
        public async Task Scorable_Where()
        {
            foreach (var hasScore in new[] { false, true })
            {
                foreach (var whereScore in new[] { false, true })
                {
                    // arrange
                    var mock = Mock(Item, Score, Token, hasScore);
                    var test = mock.Object.WhereScore((i, s) => whereScore);
                    // act
                    bool actualPost = await test.TryPostAsync(Item, Token);
                    // assert
                    bool expectedPost = hasScore && whereScore;
                    Assert.AreEqual(expectedPost, actualPost);
                    Verify(mock, Item, Token, Once(true), Once(true), Many(hasScore), Once(expectedPost));
                }
            }
        }

        [TestMethod]
        public async Task Scorable_First()
        {
            foreach (var hasScoreOne in new[] { false, true })
            {
                foreach (var hasScoreTwo in new[] { false, true })
                {
                    // arrange
                    var mockOne = Mock(Item, Score, Token, hasScoreOne);
                    var mockTwo = Mock(Item, Score, Token, hasScoreTwo);
                    var scorables = new[] { mockOne.Object, mockTwo.Object };
                    var test = scorables.First();
                    // act
                    bool actualPost = await test.TryPostAsync(Item, Token);
                    // assert
                    bool expectedPost = hasScoreOne || hasScoreTwo;
                    Assert.AreEqual(expectedPost, actualPost);
                    Verify(mockOne, Item, Token, Once(true), Many(true), Many(hasScoreOne), Once(hasScoreOne));
                    Verify(mockTwo, Item, Token, Once(!hasScoreOne), Many(!hasScoreOne), Many(!hasScoreOne && hasScoreTwo), Once(!hasScoreOne && hasScoreTwo));
                }
            }
        }

        public static readonly ITraits<double> Traits = new NormalizedTraits();
        public static readonly IComparer<double> Comparer = Comparer<double>.Default;

        [TestMethod]
        public async Task Scorable_Traits()
        {
            var tests = new[]
            {
                new { hasScore = false, score = Traits.Minimum },
                new { hasScore = true, score = Traits.Minimum },
                new { hasScore = true, score = Traits.Maximum },
                new { hasScore = true, score = Traits.Minimum + (Traits.Maximum - Traits.Minimum) / 2.0 },
            };
            foreach (var testOne in tests)
            {
                foreach (var testTwo in tests)
                {
                    // arrange
                    var mockOne = Mock(Item, testOne.score, Token, testOne.hasScore);
                    var mockTwo = Mock(Item, testTwo.score, Token, testTwo.hasScore);
                    var scorables = new[] { mockOne.Object, mockTwo.Object };
                    var test = new TraitsScorable<string, double>(Traits, Comparer, scorables);
                    // act
                    bool actualPost = await test.TryPostAsync(Item, Token);
                    // assert
                    var expectedPost = testOne.hasScore || testTwo.hasScore;
                    Assert.AreEqual(expectedPost, actualPost);

                    bool earlyOut = testOne.hasScore && Comparer.Compare(testOne.score, Traits.Maximum) == 0;

                    var compare = Comparer.Compare(testOne.score, testTwo.score);
                    bool largeOne = (testOne.hasScore && !testTwo.hasScore) || (testOne.hasScore && testTwo.hasScore && compare >= 0);
                    bool largeTwo = (!testOne.hasScore && testTwo.hasScore) || (testOne.hasScore && testTwo.hasScore && compare < 0);

                    Verify(mockOne, Item, Token, Once(true), Many(true), Many(testOne.hasScore), Once(testOne.hasScore && largeOne));
                    Verify(mockTwo, Item, Token, Once(!earlyOut), Many(!earlyOut), Many(!earlyOut && testTwo.hasScore), Once(!earlyOut && testTwo.hasScore && largeTwo));
                }
            }
        }
    }
}